import { ReportModule, ReportQuerySpec } from '@/services/reportBuilderService';

export interface ParsedNLQueryResult {
  spec: ReportQuerySpec;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
}

export function parseNaturalLanguageQuery(query: string, _schema?: ReportModule[]): ParsedNLQueryResult {
  const q = query.toLowerCase().trim();

  // Primary module inference
  let rootModule = 'trips';
  if (q.includes('driver')) rootModule = 'drivers';
  else if (q.includes('vehicle') || q.includes('truck') || q.includes('fleet')) rootModule = 'vehicles';
  else if (q.includes('customer') || q.includes('client')) rootModule = 'customers';
  else if (q.includes('invoice') || q.includes('billing')) rootModule = 'invoices';
  else if (q.includes('expense') || q.includes('cost')) rootModule = 'expenses';
  else if (q.includes('maintenance') || q.includes('repair')) rootModule = 'maintenance';
  else if (q.includes('third party') || q.includes('provider')) rootModule = 'thirdParty';

  const rows: string[] = [];
  const values: { field: string; agg: 'sum' | 'avg' | 'min' | 'max' | 'count' }[] = [];
  const filters: any[] = [];

  if (rootModule === 'drivers') {
    rows.push('drivers.full_name');
    if (q.includes('revenue') || q.includes('earn')) {
      values.push({ field: 'trips.revenue', agg: 'sum' });
    }
    values.push({ field: 'trips.count', agg: 'sum' });
  } else if (rootModule === 'vehicles') {
    rows.push('vehicles.plate_number');
    if (q.includes('maintenance') || q.includes('cost') || q.includes('repair')) {
      values.push({ field: 'maintenance.cost', agg: 'sum' });
    }
    if (q.includes('revenue') || q.includes('earn')) {
      values.push({ field: 'trips.revenue', agg: 'sum' });
    }
  } else if (rootModule === 'invoices') {
    rows.push('invoices.ref_id');
    values.push({ field: 'invoices.total_amount', agg: 'sum' });
    if (q.includes('overdue')) {
      filters.push({ field: 'invoices.status', op: 'eq', value: 'Overdue' });
    } else if (q.includes('pending') || q.includes('unpaid')) {
      filters.push({ field: 'invoices.status', op: 'eq', value: 'Pending' });
    }
  } else if (rootModule === 'customers') {
    rows.push('customers.name');
    values.push({ field: 'invoices.total_amount', agg: 'sum' });
  } else if (rootModule === 'expenses') {
    rows.push('expenses.category');
    values.push({ field: 'expenses.amount', agg: 'sum' });
  } else if (rootModule === 'maintenance') {
    rows.push('maintenance.maintenance_type');
    values.push({ field: 'maintenance.cost', agg: 'sum' });
  } else {
    // trips
    rows.push('trips.ref_id');
    values.push({ field: 'trips.revenue', agg: 'sum' });
    if (q.includes('completed')) {
      filters.push({ field: 'trips.status', op: 'eq', value: 'Completed' });
    }
  }

  let dateRange: { start?: string; end?: string; field?: string } | undefined;
  const now = new Date();
  if (q.includes('this month')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    dateRange = { start };
  } else if (q.includes('last month')) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    dateRange = { start, end };
  }

  const spec: ReportQuerySpec = {
    rootModule,
    rows,
    values: values.length ? values : [{ field: `${rootModule}.id`, agg: 'count' }],
    filters,
    dateRange,
  };

  return {
    spec,
    confidence: 'high',
    explanation: `Parsed askMercon request for root module "${rootModule}" with ${rows.length} row dimension(s) and ${spec.values.length} metric(s).`,
  };
}
