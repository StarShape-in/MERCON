/**
 * Delay Report — the log, the on-time grid, and the analysis, behind one
 * filter bar.
 *
 * The three views deliberately share filter state rather than each owning its
 * own: choosing a company is meant to narrow all of them at once, so the
 * drill-down is "the same screens, filtered" instead of a separate screen per
 * question. Switching tabs keeps the scope you already set.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Download, TrendingDown, TrendingUp } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  reportsService,
  type DelayDimension,
  type DelayGranularity,
  type DelayLogRow,
} from '@/services/reportsService';
import { customerService } from '@/services/customerService';
import { DELAY_REASON_LABELS, type DelayReason } from '@/services/tripService';
import { downloadCSV } from '@/utils/exportUtils';

type Tab = 'log' | 'grid' | 'analysis';

/**
 * How far back to look, and how finely to slice it — two separate things.
 *
 * Bucketing a year *by year* collapses the grid to a single column and hides
 * the trend that made looking at a year worthwhile. So each range carries the
 * bucket that keeps a readable number of columns and matches how the client's
 * own sheet is laid out: a year read monthly, a quarter weekly, shorter
 * ranges daily.
 */
const PERIODS: { id: string; label: string; days: number; bucket: DelayGranularity }[] = [
  { id: 'today', label: 'Today', days: 1, bucket: 'day' },
  { id: 'week', label: 'Week', days: 7, bucket: 'day' },
  { id: 'month', label: 'Month', days: 30, bucket: 'day' },
  { id: 'quarter', label: 'Quarter', days: 90, bucket: 'week' },
  { id: 'year', label: 'Year', days: 365, bucket: 'month' },
];

const DIMENSIONS: { id: DelayDimension; label: string }[] = [
  { id: 'route', label: 'Route' },
  { id: 'driver', label: 'Driver' },
  { id: 'customer', label: 'Company' },
  { id: 'vehicle', label: 'Truck' },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function reasonLabel(reason: string | null): string {
  if (!reason) return 'Not recorded';
  if (reason === 'Unrecorded') return 'Not recorded';
  return DELAY_REASON_LABELS[reason as DelayReason] ?? reason;
}

/** Severity band for a delay, so the eye finds the bad rows before reading. */
function delayTone(hours: number): string {
  if (hours >= 4) return 'bg-red-100 text-red-800';
  if (hours >= 2) return 'bg-orange-100 text-orange-800';
  return 'bg-amber-100 text-amber-800';
}

/** Same bands, applied to an on-time percentage. */
function pctTone(pct: number | null): string {
  if (pct === null) return 'text-slate-300';
  if (pct >= 95) return 'bg-emerald-50 text-emerald-700';
  if (pct >= 80) return 'bg-amber-50 text-amber-700';
  if (pct >= 50) return 'bg-orange-50 text-orange-700';
  return 'bg-red-50 text-red-700 font-bold';
}

function Delta({ value, suffix = '%', invert = true }: { value: number | null; suffix?: string; invert?: boolean }) {
  if (value === null || value === 0) return <span className="text-[11px] text-slate-400">—</span>;
  // More delay is worse, so a rise is red — the opposite of a revenue chart.
  const bad = invert ? value > 0 : value < 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`text-[11px] font-bold inline-flex items-center gap-0.5 ${bad ? 'text-red-600' : 'text-emerald-600'}`}>
      <Icon size={11} />{Math.abs(value)}{suffix}
    </span>
  );
}

export default function DelayReportPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('log');
  const [periodId, setPeriodId] = useState('month');
  const [customerId, setCustomerId] = useState('');
  const [dimension, setDimension] = useState<DelayDimension>('route');
  const [needsReasonOnly, setNeedsReasonOnly] = useState(false);
  const [page, setPage] = useState(1);

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[2];
  const granularity: DelayGranularity = period.bucket;
  const startDate = useMemo(() => isoDaysAgo(period.days), [period.days]);

  const filters = useMemo(
    () => ({
      startDate,
      ...(customerId ? { customer_id: customerId } : {}),
      ...(needsReasonOnly ? { needs_reason: 'true' as const } : {}),
    }),
    [startDate, customerId, needsReasonOnly],
  );

  const { data: customers } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200 }),
  });

  const log = useQuery({
    queryKey: ['delay-log', filters, page],
    queryFn: () => reportsService.getDelayLog({ ...filters, page, per_page: 25 }),
    enabled: tab === 'log',
  });

  const grid = useQuery({
    queryKey: ['delay-grid', filters, dimension, granularity],
    queryFn: () => reportsService.getDelayGrid({ ...filters, dimension, granularity }),
    enabled: tab === 'grid',
  });

  const analysis = useQuery({
    queryKey: ['delay-analysis', filters, granularity],
    queryFn: () => reportsService.getDelayAnalysis({ ...filters, granularity }),
    enabled: tab === 'analysis',
  });

  const handleExport = () => {
    const rows = log.data?.data ?? [];
    if (rows.length === 0) return;
    downloadCSV(
      rows.map((r: DelayLogRow) => ({
        Date: new Date(r.date).toLocaleString(),
        Trip: r.trip_ref ?? '',
        Route: r.route,
        Company: r.customer,
        Driver: r.driver,
        Truck: r.vehicle,
        'Planned arrival': new Date(r.planned_arrival).toLocaleString(),
        'Actual arrival': new Date(r.actual_arrival).toLocaleString(),
        'Delay (h)': r.delay_hours,
        'Waiting (h)': r.dwell_hours ?? '',
        Reason: reasonLabel(r.delay_reason),
        Note: r.delay_note ?? '',
      })),
      `mercon_delays_${startDate}.csv`,
    );
  };

  const customerList = customers?.data ?? [];

  return (
    <DashboardLayout active="Reports" title="Delay Report" pageTitle="Delay Report">
      <div className="px-6 pb-8 space-y-4">

        {/* Filter bar — shared by all three tabs */}
        <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm p-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-md overflow-hidden border border-slate-200">
            {(['log', 'grid', 'analysis'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 h-8 text-xs font-bold capitalize transition-colors ${
                  tab === t ? 'bg-[#111] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t === 'grid' ? 'On-time grid' : t}
              </button>
            ))}
          </div>

          <div className="flex rounded-md overflow-hidden border border-slate-200">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPeriodId(p.id); setPage(1); }}
                className={`px-2.5 h-8 text-xs font-semibold transition-colors ${
                  periodId === p.id ? 'bg-[#E8450F] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <select
            value={customerId}
            onChange={(e) => { setCustomerId(e.target.value); setPage(1); }}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#E8450F]"
          >
            <option value="">All companies</option>
            {customerList.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {tab === 'log' && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={needsReasonOnly}
                onChange={(e) => { setNeedsReasonOnly(e.target.checked); setPage(1); }}
                className="accent-[#E8450F]"
              />
              Needs a reason
            </label>
          )}

          {tab === 'grid' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Rows:</span>
              <div className="flex rounded-md overflow-hidden border border-slate-200">
                {DIMENSIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDimension(d.id)}
                    className={`px-2.5 h-8 text-xs font-semibold transition-colors ${
                      dimension === d.id ? 'bg-[#111] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'log' && (
            <button
              type="button"
              onClick={handleExport}
              disabled={!log.data?.data?.length}
              className="ml-auto h-8 px-3 rounded-md border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>

        {/* ---------------- Log ---------------- */}
        {tab === 'log' && (
          <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm overflow-hidden">
            {log.isLoading && <p className="p-6 text-sm text-slate-500">Loading…</p>}
            {log.isError && <p className="p-6 text-sm text-red-600">Could not load the delay log. Try again.</p>}
            {log.data && log.data.data.length === 0 && (
              <p className="p-6 text-sm text-slate-500">
                No delays over {log.data.meta.threshold_minutes} minutes in this period. Nothing to explain.
              </p>
            )}
            {log.data && log.data.data.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="text-left font-bold px-3 py-2.5">Date</th>
                        <th className="text-left font-bold px-3 py-2.5">Route</th>
                        <th className="text-left font-bold px-3 py-2.5">Trip</th>
                        <th className="text-left font-bold px-3 py-2.5">Company</th>
                        <th className="text-left font-bold px-3 py-2.5">Driver</th>
                        <th className="text-left font-bold px-3 py-2.5">Truck</th>
                        <th className="text-right font-bold px-3 py-2.5">Delay</th>
                        <th className="text-right font-bold px-3 py-2.5">Waiting</th>
                        <th className="text-left font-bold px-3 py-2.5">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.data.data.map((r) => (
                        <tr
                          key={r.stop_id}
                          onClick={() => navigate(`/trips/${r.trip_id}`)}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                        >
                          <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                            {new Date(r.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2.5 text-[#111] whitespace-nowrap">{r.route}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-400 whitespace-nowrap">{r.trip_ref ?? '—'}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{r.customer}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{r.driver}</td>
                          <td className="px-3 py-2.5 font-mono whitespace-nowrap">{r.vehicle}</td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold ${delayTone(r.delay_hours)}`}>
                              +{r.delay_hours}h
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-500 whitespace-nowrap">
                            {r.dwell_hours === null ? '—' : `${r.dwell_hours}h`}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {r.needs_reason ? (
                              <span className="inline-flex items-center gap-1 text-[#E8450F] font-bold">
                                <AlertTriangle size={11} /> Add reason
                              </span>
                            ) : (
                              <span className="text-slate-700">
                                {reasonLabel(r.delay_reason)}
                                {r.delay_note ? <span className="text-slate-400"> — {r.delay_note}</span> : null}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-200 text-xs text-slate-600">
                  <span>
                    {log.data.meta.total} delayed arrival{log.data.meta.total === 1 ? '' : 's'}
                    {log.data.meta.truncated && ' (showing the most recent — narrow the range for a complete count)'}
                  </span>
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="h-7 px-2.5 rounded border border-slate-200 font-bold disabled:opacity-40 hover:bg-slate-50"
                    >
                      Prev
                    </button>
                    <span>Page {log.data.meta.page} of {Math.max(log.data.meta.total_pages, 1)}</span>
                    <button
                      type="button"
                      disabled={page >= log.data.meta.total_pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-7 px-2.5 rounded border border-slate-200 font-bold disabled:opacity-40 hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------- Grid ---------------- */}
        {tab === 'grid' && (
          <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm overflow-hidden">
            {grid.isLoading && <p className="p-6 text-sm text-slate-500">Loading…</p>}
            {grid.isError && <p className="p-6 text-sm text-red-600">Could not load the grid. Try again.</p>}
            {grid.data && grid.data.rows.length === 0 && (
              <p className="p-6 text-sm text-slate-500">No arrivals with a planned time in this period.</p>
            )}
            {grid.data && grid.data.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="text-left font-bold px-3 py-2.5 sticky left-0 bg-slate-50">
                        {DIMENSIONS.find((d) => d.id === grid.data!.dimension)?.label}
                      </th>
                      <th className="text-right font-bold px-3 py-2.5">Overall</th>
                      {grid.data.periods.map((p) => (
                        <th key={p.key} className="text-right font-bold px-3 py-2.5 whitespace-nowrap">{p.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b-2 border-slate-200 bg-slate-50/50">
                      <td className="px-3 py-2.5 font-bold sticky left-0 bg-slate-50/50">All</td>
                      <td className="px-3 py-2.5" />
                      {grid.data.all_rows.cells.map((c) => (
                        <td key={c.period} className={`px-3 py-2.5 text-right font-mono ${pctTone(c.pct)}`}>
                          {c.pct === null ? '–' : `${c.pct}%`}
                        </td>
                      ))}
                    </tr>
                    {grid.data.rows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2.5 text-[#111] whitespace-nowrap sticky left-0 bg-white">{row.label}</td>
                        <td className={`px-3 py-2.5 text-right font-mono font-bold ${pctTone(row.overall_pct)}`}>
                          {row.overall_pct === null ? '–' : `${row.overall_pct}%`}
                        </td>
                        {row.cells.map((c) => (
                          <td key={c.period} className={`px-3 py-2.5 text-right font-mono ${pctTone(c.pct)}`}>
                            {c.pct === null ? '–' : `${c.pct}%`}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ---------------- Analysis ---------------- */}
        {tab === 'analysis' && (
          <div className="space-y-4">
            {analysis.isLoading && <p className="p-6 text-sm text-slate-500">Loading…</p>}
            {analysis.isError && <p className="p-6 text-sm text-red-600">Could not load the analysis. Try again.</p>}
            {analysis.data && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Hours lost', value: `${analysis.data.totals.hours_lost}h`, delta: analysis.data.change.hours_lost_pct },
                    { label: 'Delayed arrivals', value: analysis.data.totals.delayed, delta: null, raw: analysis.data.change.delayed_count },
                    { label: 'On-time', value: analysis.data.totals.on_time_pct === null ? '—' : `${analysis.data.totals.on_time_pct}%`, delta: null },
                    { label: 'Unexplained', value: analysis.data.totals.unexplained, delta: null },
                  ].map((k) => (
                    <div key={k.label} className="bg-white rounded-lg border border-black/[0.06] shadow-sm p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{k.label}</p>
                      <p className="text-2xl font-extrabold text-[#111] mt-1">{k.value}</p>
                      {k.delta !== null && k.delta !== undefined && <Delta value={k.delta} />}
                      {k.raw !== undefined && k.raw !== 0 && (
                        <span className={`text-[11px] font-bold ${k.raw > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {k.raw > 0 ? '+' : ''}{k.raw} vs previous
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {analysis.data.trend.length > 0 && (
                  <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm p-4">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-3">
                      Hours lost over time
                    </p>
                    <div className="flex items-end gap-1.5 h-28">
                      {(() => {
                        const max = Math.max(...analysis.data!.trend.map((t) => t.hours_lost), 1);
                        return analysis.data!.trend.map((t) => (
                          // h-full matters: the bar's height is a percentage,
                          // which resolves to zero unless this column has a
                          // definite height to resolve against.
                          <div key={t.period} className="flex-1 h-full flex flex-col justify-end items-center gap-1 min-w-0">
                            <span className="text-[9px] font-mono text-slate-400">{t.hours_lost}</span>
                            <div
                              className="w-full bg-[#E8450F]/80 rounded-t"
                              style={{ height: `${Math.max((t.hours_lost / max) * 100, 2)}%` }}
                              title={`${t.label}: ${t.hours_lost}h`}
                            />
                            <span className="text-[9px] text-slate-500 truncate w-full text-center">{t.label}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Board title="Worst routes — hours lost">
                    {analysis.data.routes.map((r) => (
                      <Row key={r.label} label={r.label} value={`${r.hours_lost}h`} delta={<Delta value={r.change_pct} />} />
                    ))}
                  </Board>

                  <Board title="Drivers — late / total arrivals">
                    {analysis.data.drivers.map((d) => (
                      <Row
                        key={d.label}
                        label={d.label}
                        value={`${d.late} / ${d.total}`}
                        delta={<Delta value={d.change === 0 ? null : d.change} suffix="" />}
                      />
                    ))}
                  </Board>

                  <Board title="Reasons — share of delays">
                    {analysis.data.reasons.map((r) => (
                      <Row
                        key={r.reason}
                        label={reasonLabel(r.reason)}
                        value={`${r.share_pct}%`}
                        delta={<Delta value={r.change_pt === 0 ? null : r.change_pt} suffix="pt" />}
                      />
                    ))}
                  </Board>

                  <Board title="Trucks — breakdowns & repair spend">
                    {analysis.data.vehicles.length === 0 && (
                      <p className="text-xs text-slate-400 py-2">No breakdown-related delays in this period.</p>
                    )}
                    {analysis.data.vehicles.map((v) => (
                      <Row
                        key={v.label}
                        label={v.label}
                        // "SAR" rather than the ﷼ sign: the glyph is
                        // right-to-left and swaps sides of the digits when
                        // rendered next to them, reading as "0﷼" not "﷼6,100".
                        value={`${v.breakdowns} · SAR ${v.maintenance_cost.toLocaleString()}`}
                        delta={<Delta value={v.change === 0 ? null : v.change} suffix="" />}
                      />
                    ))}
                  </Board>
                </div>

                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Clock size={11} />
                  Compared against {new Date(analysis.data.previous_range.start).toLocaleDateString()} –{' '}
                  {new Date(analysis.data.previous_range.end).toLocaleDateString()}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Board({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm p-4">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-2">{title}</p>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Row({ label, value, delta }: { label: string; value: string; delta: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="truncate text-slate-700">{label}</span>
      <span className="flex items-center gap-2 shrink-0">
        <span className="font-mono font-bold text-[#111]">{value}</span>
        <span className="w-12 text-right">{delta}</span>
      </span>
    </div>
  );
}
