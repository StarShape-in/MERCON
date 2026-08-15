// Resolves a user-built ReportQuerySpec (from the Advanced Builder / Quick
// Report / Ask Mercon) into real rows, by validating field/module keys
// against REPORT_SCHEMA (see that file's header comment for why this is the
// injection guard), fetching a single Prisma findMany on the root module
// with includes for every directly-joined module referenced, and doing
// grouping/aggregation/filtering in JS — small dataset per report (capped),
// same approach reportsController.ts's getCustomReport already uses.
//
// v1 limitation: only ONE HOP from rootModule is resolved (matches the
// declared joins in schema.ts). A field from a module with no direct edge
// to rootModule throws a clear 400 rather than silently omitting data —
// e.g. { Driver, Vehicle, Maintenance, Documents } needs rootModule
// 'vehicles' (Driver + Maintenance are both 1 hop from Vehicles); Documents
// has no declared join anywhere (it's polymorphic, no FK) and can't be
// combined with anything yet.
import { prisma } from '../index';
import { ReportModule, ReportJoin, findModule, findField } from './schema';
import { tripIncome } from './derived';

export class ReportEngineError extends Error {}

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between';
export type AggOp = 'sum' | 'avg' | 'min' | 'max' | 'count';

export interface ReportFilter {
  field: string;
  op: FilterOp;
  value: unknown;
}

export interface ReportValueSpec {
  field: string;
  agg: AggOp;
}

export interface ReportQuerySpec {
  rootModule: string;
  rows: string[];
  columns?: string[];
  values: ReportValueSpec[];
  filters?: ReportFilter[];
  dateRange?: { start?: string; end?: string; field?: string };
  limit?: number;
}

export interface ReportResult {
  rows: Record<string, unknown>[];
  kpis: Record<string, number>;
  meta: { rowCount: number; truncated: boolean; connectedModules: string[] };
}

const MAX_RECORDS = 5000;

/** Fields computed in JS from real columns — not plain passthroughs. */
const computeScalarFieldValue = (moduleKey: string, fieldName: string, obj: any): any => {
  if (obj == null) return null;
  const fullKey = `${moduleKey}.${fieldName}`;
  switch (fullKey) {
    case 'drivers.full_name':
      return `${obj.first_name || ''} ${obj.last_name || ''}`.trim();
    case 'trips.revenue':
      return tripIncome(obj);
    case 'trips.count':
      return 1;
    case 'invoices.outstanding':
      return obj.status === 'Pending' || obj.status === 'Overdue' ? obj.total_amount || 0 : 0;
    default:
      return obj[fieldName] ?? null;
  }
};

/** True for keys like `drivers.full_name` that don't map to a raw column. */
const COMPUTED_FIELD_KEYS = new Set(['drivers.full_name', 'trips.revenue', 'trips.count', 'invoices.outstanding']);

const validateFieldKey = (key: string): void => {
  if (COMPUTED_FIELD_KEYS.has(key)) return;
  if (!findField(key)) throw new ReportEngineError(`Unknown report field "${key}"`);
};

const buildJoinInfo = (root: ReportModule, neededModuleKeys: Set<string>): Map<string, ReportJoin> => {
  const map = new Map<string, ReportJoin>();
  for (const modKey of neededModuleKeys) {
    if (modKey === root.key) continue;
    const edge = root.joins.find((j) => j.toModule === modKey);
    if (!edge) {
      const target = findModule(modKey);
      throw new ReportEngineError(
        `"${target?.label || modKey}" can't be combined with "${root.label}" directly — no declared relationship. Try selecting "${target?.label || modKey}" as the primary module instead.`
      );
    }
    map.set(modKey, edge);
  }
  return map;
};

const extractDimensionValue = (fieldKey: string, record: any, rootKey: string, joinInfo: Map<string, ReportJoin>): any => {
  const moduleKey = fieldKey.split('.')[0];
  const fieldName = fieldKey.slice(moduleKey.length + 1);
  if (moduleKey === rootKey) return computeScalarFieldValue(moduleKey, fieldName, record);
  const edge = joinInfo.get(moduleKey);
  if (!edge) return null;
  const related = record[edge.relationField];
  const target = edge.cardinality === 'toMany' ? (Array.isArray(related) ? related[0] : related) : related;
  return computeScalarFieldValue(moduleKey, fieldName, target);
};

/** For Values fields: a single number per root record, rolled up across a toMany join if needed. */
const extractMetricValue = (valueSpec: ReportValueSpec, record: any, rootKey: string, joinInfo: Map<string, ReportJoin>): number => {
  const moduleKey = valueSpec.field.split('.')[0];
  const fieldName = valueSpec.field.slice(moduleKey.length + 1);

  if (moduleKey === rootKey) {
    const v = computeScalarFieldValue(moduleKey, fieldName, record);
    return typeof v === 'number' ? v : 0;
  }

  const edge = joinInfo.get(moduleKey);
  if (!edge) return 0;
  const related = record[edge.relationField];

  if (edge.cardinality === 'toOne') {
    const v = computeScalarFieldValue(moduleKey, fieldName, related);
    return typeof v === 'number' ? v : 0;
  }

  const items: any[] = Array.isArray(related) ? related : [];
  const values = items.map((it) => computeScalarFieldValue(moduleKey, fieldName, it)).filter((v) => typeof v === 'number') as number[];
  if (fieldName === 'count') return items.length;
  if (values.length === 0) return 0;
  switch (valueSpec.agg) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'count':
      return values.length;
    default:
      return values.reduce((a, b) => a + b, 0);
  }
};

const aggregate = (values: number[], agg: AggOp): number => {
  if (values.length === 0) return 0;
  switch (agg) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'count':
      return values.length;
    default:
      return values.reduce((a, b) => a + b, 0);
  }
};

const matchesFilter = (dimValue: any, filter: ReportFilter): boolean => {
  const { op, value } = filter;
  switch (op) {
    case 'eq':
      return dimValue === value;
    case 'neq':
      return dimValue !== value;
    case 'gt':
      return Number(dimValue) > Number(value);
    case 'gte':
      return Number(dimValue) >= Number(value);
    case 'lt':
      return Number(dimValue) < Number(value);
    case 'lte':
      return Number(dimValue) <= Number(value);
    case 'in':
      return Array.isArray(value) && value.includes(dimValue);
    case 'contains':
      return typeof dimValue === 'string' && typeof value === 'string' && dimValue.toLowerCase().includes(value.toLowerCase());
    case 'between': {
      const [lo, hi] = Array.isArray(value) ? value : [null, null];
      return Number(dimValue) >= Number(lo) && Number(dimValue) <= Number(hi);
    }
    default:
      return true;
  }
};

export async function runReportQuery(spec: ReportQuerySpec): Promise<ReportResult> {
  const root = findModule(spec.rootModule);
  if (!root) throw new ReportEngineError(`Unknown module "${spec.rootModule}"`);

  const rows = spec.rows || [];
  const columns = spec.columns || [];
  const values = spec.values && spec.values.length > 0 ? spec.values : [];
  const filters = spec.filters || [];

  const allFieldKeys = [...rows, ...columns, ...values.map((v) => v.field), ...filters.map((f) => f.field)];
  allFieldKeys.forEach(validateFieldKey);

  const neededModules = new Set(allFieldKeys.map((k) => k.split('.')[0]));
  if (root.key === 'drivers') {
    neededModules.add('trips');
  }

  const joinInfo = buildJoinInfo(root, neededModules);

  const tripDateFilter: Record<string, any> = { deletedAt: null };
  if (spec.dateRange?.start || spec.dateRange?.end) {
    const range: Record<string, Date> = {};
    if (spec.dateRange.start) range.gte = new Date(spec.dateRange.start);
    if (spec.dateRange.end) {
      const end = new Date(spec.dateRange.end);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    tripDateFilter.createdAt = range;
  }

  const include: Record<string, any> = {};
  for (const [, edge] of joinInfo) {
    if (edge.cardinality === 'toMany') {
      include[edge.relationField] = {
        where: edge.toModule === 'trips' ? tripDateFilter : { deletedAt: null },
      };
    } else {
      include[edge.relationField] = true;
    }
  }

  const where: Record<string, any> = { deletedAt: null };
  if (root.key !== 'drivers' && (spec.dateRange?.start || spec.dateRange?.end)) {
    const dateField = spec.dateRange.field || root.defaultDateField;
    const range: Record<string, Date> = {};
    if (spec.dateRange.start) range.gte = new Date(spec.dateRange.start);
    if (spec.dateRange.end) {
      const end = new Date(spec.dateRange.end);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    where[dateField] = range;
  }

  const delegate = (prisma as any)[root.prismaModel];
  if (!delegate) throw new ReportEngineError(`No data source for module "${root.key}"`);

  const records = await delegate.findMany({
    where,
    include: Object.keys(include).length > 0 ? include : undefined,
    take: MAX_RECORDS + 1,
    orderBy: { [root.defaultDateField]: 'desc' },
  });

  const truncated = records.length > MAX_RECORDS;
  const fetched = truncated ? records.slice(0, MAX_RECORDS) : records;

  // Post-fetch JS filtering (dataset is capped, consistent with the rest of
  // the reports controllers' JS-side aggregation approach).
  const filtered = fetched.filter((record: any) =>
    filters.every((f) => matchesFilter(extractDimensionValue(f.field, record, root.key, joinInfo), f))
  );

  // Group by rows+columns dimension key (or one group per record if none chosen).
  const groupKeyOf = (record: any) =>
    [...rows, ...columns].map((k) => String(extractDimensionValue(k, record, root.key, joinInfo) ?? '—')).join('||');

  const groups = new Map<string, { dims: Record<string, any>; records: any[] }>();
  for (const record of filtered) {
    const key = groupKeyOf(record);
    if (!groups.has(key)) {
      const dims: Record<string, any> = {};
      for (const k of [...rows, ...columns]) dims[k] = extractDimensionValue(k, record, root.key, joinInfo);
      groups.set(key, { dims, records: [] });
    }
    groups.get(key)!.records.push(record);
  }

  const resultRows: Record<string, unknown>[] = [];
  for (const { dims, records: groupRecords } of groups.values()) {
    const row: Record<string, unknown> = { ...dims };
    for (const v of values) {
      row[v.field] = aggregate(
        groupRecords.map((r) => extractMetricValue(v, r, root.key, joinInfo)),
        v.agg
      );
    }
    resultRows.push(row);
  }

  // KPIs: one aggregate per Values field across the whole filtered set,
  // independent of grouping.
  const kpis: Record<string, number> = {};
  for (const v of values) {
    kpis[v.field] = aggregate(
      filtered.map((r: any) => extractMetricValue(v, r, root.key, joinInfo)),
      v.agg
    );
  }
  kpis['recordCount'] = filtered.length;

  if (root.key === 'drivers') {
    const totalCompletedTrips = filtered.reduce((sum: number, r: any) => sum + (computeScalarFieldValue('drivers', 'completed_trips', r) || 0), 0);
    const totalDispatchedTrips = filtered.reduce((sum: number, r: any) => sum + (computeScalarFieldValue('drivers', 'dispatched_trips', r) || 0), 0);
    const totalCancelledTrips = filtered.reduce((sum: number, r: any) => sum + (computeScalarFieldValue('drivers', 'cancelled_trips', r) || 0), 0);
    const totalTrips = filtered.reduce((sum: number, r: any) => sum + (computeScalarFieldValue('drivers', 'total_trips', r) || 0), 0);
    const activeDrivers = filtered.filter((r: any) => (computeScalarFieldValue('drivers', 'completed_trips', r) || 0) > 0).length;
    const inactiveDrivers = filtered.length - activeDrivers;
    const avgTripsPerActiveDriver = activeDrivers > 0 ? Number((totalCompletedTrips / activeDrivers).toFixed(2)) : null;

    kpis['totalCompletedTrips'] = totalCompletedTrips;
    kpis['totalDispatchedTrips'] = totalDispatchedTrips;
    kpis['totalCancelledTrips'] = totalCancelledTrips;
    kpis['totalTrips'] = totalTrips;
    kpis['totalDrivers'] = filtered.length;
    kpis['activeDrivers'] = activeDrivers;
    kpis['inactiveDrivers'] = inactiveDrivers;
    if (avgTripsPerActiveDriver !== null) {
      kpis['avgTripsPerActiveDriver'] = avgTripsPerActiveDriver;
    }
  }

  return {
    rows: resultRows,
    kpis,
    meta: {
      rowCount: resultRows.length,
      truncated,
      connectedModules: Array.from(joinInfo.keys()),
    },
  };
}
