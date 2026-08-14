import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Zap,
  ArrowLeft,
  ChevronRight,
  RotateCw,
  Download,
  SlidersHorizontal,
  FileSpreadsheet,
  Users,
  Car,
  Truck,
  Building2,
  ReceiptText,
  Wallet,
  Wrench
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import KpiCard from '@/components/ui/KpiCard';
import DataTable from '@/components/ui/DataTable';
import { reportBuilderService, ReportQuerySpec, ReportResult } from '@/services/reportBuilderService';
import { downloadCSV, exportPDF, exportExcel } from '@/utils/exportUtils';

interface PresetOption {
  id: string;
  moduleKey: string;
  moduleLabel: string;
  icon: any;
  questions: {
    id: string;
    title: string;
    description: string;
    rows: string[];
    values: { field: string; agg: 'sum' | 'avg' | 'min' | 'max' | 'count' }[];
    filters?: any[];
  }[];
}

const PRESETS: PresetOption[] = [
  {
    id: 'drivers',
    moduleKey: 'drivers',
    moduleLabel: 'Drivers',
    icon: Users,
    questions: [
      {
        id: 'driver-revenue',
        title: 'Total Revenue Earned by Driver',
        description: 'Sum of completed trip billing grouped by assigned driver.',
        rows: ['drivers.full_name', 'drivers.status'],
        values: [
          { field: 'trips.revenue', agg: 'sum' },
          { field: 'trips.count', agg: 'sum' },
        ],
      },
      {
        id: 'driver-trips',
        title: 'Trip Volume & Activity Count per Driver',
        description: 'Total dispatched and completed trip count by driver.',
        rows: ['drivers.full_name', 'drivers.license_number'],
        values: [{ field: 'trips.count', agg: 'sum' }],
      },
    ],
  },
  {
    id: 'vehicles',
    moduleKey: 'vehicles',
    moduleLabel: 'Vehicles',
    icon: Car,
    questions: [
      {
        id: 'vehicle-maint',
        title: 'Vehicle Maintenance Repair Costs',
        description: 'Sum of service and repair expenses per vehicle plate.',
        rows: ['vehicles.plate_number', 'vehicles.asset_type', 'vehicles.status'],
        values: [
          { field: 'maintenance.cost', agg: 'sum' },
          { field: 'trips.revenue', agg: 'sum' },
        ],
      },
      {
        id: 'vehicle-trips',
        title: 'Fleet Trip Revenue Breakdown',
        description: 'Billing generated per truck asset.',
        rows: ['vehicles.plate_number', 'vehicles.capacity_kg'],
        values: [{ field: 'trips.revenue', agg: 'sum' }],
      },
    ],
  },
  {
    id: 'trips',
    moduleKey: 'trips',
    moduleLabel: 'Trips',
    icon: Truck,
    questions: [
      {
        id: 'trips-status',
        title: 'Trip Revenue & Volume by Status',
        description: 'Revenue totals grouped by trip operational status.',
        rows: ['trips.status'],
        values: [
          { field: 'trips.revenue', agg: 'sum' },
          { field: 'trips.count', agg: 'sum' },
        ],
      },
    ],
  },
  {
    id: 'customers',
    moduleKey: 'customers',
    moduleLabel: 'Customers',
    icon: Building2,
    questions: [
      {
        id: 'customer-biling',
        title: 'Top Customer Billing & Invoice Totals',
        description: 'Billed amount across top logistics clients.',
        rows: ['customers.company_name'],
        values: [{ field: 'invoices.total_amount', agg: 'sum' }],
      },
    ],
  },
  {
    id: 'invoices',
    moduleKey: 'invoices',
    moduleLabel: 'Invoices',
    icon: ReceiptText,
    questions: [
      {
        id: 'invoice-outstanding',
        title: 'Overdue & Pending Invoices Ledger',
        description: 'Outstanding balance breakdowns grouped by status.',
        rows: ['invoices.status'],
        values: [
          { field: 'invoices.total_amount', agg: 'sum' },
          { field: 'invoices.outstanding', agg: 'sum' },
        ],
      },
    ],
  },
  {
    id: 'expenses',
    moduleKey: 'expenses',
    moduleLabel: 'Expenses',
    icon: Wallet,
    questions: [
      {
        id: 'expenses-cat',
        title: 'Operating Expenses by Category',
        description: 'Fuel, toll, labor and repair costs summarized.',
        rows: ['expenses.category'],
        values: [{ field: 'expenses.amount', agg: 'sum' }],
      },
    ],
  },
  {
    id: 'maintenance',
    moduleKey: 'maintenance',
    moduleLabel: 'Maintenance',
    icon: Wrench,
    questions: [
      {
        id: 'maint-type',
        title: 'Repair Costs by Service Type',
        description: 'Preventive vs breakdown repair expenditures.',
        rows: ['maintenance.service_type'],
        values: [{ field: 'maintenance.cost', agg: 'sum' }],
      },
    ],
  },
];

const TIME_RANGES = [
  { id: 'all', label: 'All Time' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'ytd', label: 'Year to Date (YTD)' },
];

export default function QuickReportPage() {
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState<string>('drivers');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('driver-revenue');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');
  const [executedSpec, setExecutedSpec] = useState<ReportQuerySpec | null>(null);

  const activeModuleObj = PRESETS.find((p) => p.moduleKey === selectedModule) || PRESETS[0];
  const activeQuestion = activeModuleObj.questions.find((q) => q.id === selectedQuestionId) || activeModuleObj.questions[0];

  const buildCurrentSpec = (): ReportQuerySpec => {
    let dateRange: { start?: string; end?: string } | undefined;
    const now = new Date();
    if (selectedTimeRange === 'this_month') {
      dateRange = { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
    } else if (selectedTimeRange === 'last_month') {
      dateRange = {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString(),
      };
    } else if (selectedTimeRange === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      dateRange = { start: new Date(now.getFullYear(), qMonth, 1).toISOString() };
    } else if (selectedTimeRange === 'ytd') {
      dateRange = { start: new Date(now.getFullYear(), 0, 1).toISOString() };
    }

    return {
      rootModule: selectedModule,
      rows: activeQuestion.rows,
      values: activeQuestion.values,
      filters: activeQuestion.filters || [],
      dateRange,
    };
  };

  const { data: resultData, isLoading, refetch, isError, error } = useQuery<ReportResult>({
    queryKey: ['quickReportQuery', executedSpec],
    queryFn: () => reportBuilderService.runQuery(executedSpec!),
    enabled: !!executedSpec,
  });

  const handleGenerate = () => {
    const spec = buildCurrentSpec();
    setExecutedSpec(spec);
  };

  const handleOpenInAdvanced = () => {
    const spec = executedSpec || buildCurrentSpec();
    navigate('/report-builder/advanced', { state: { initialSpec: spec } });
  };

  const handleExportCSV = () => {
    if (!resultData?.rows.length) return;
    downloadCSV(resultData.rows, `${selectedModule}_quick_report.csv`);
  };

  const handleExportExcel = () => {
    if (!resultData?.rows.length) return;
    exportExcel(resultData.rows, 'Quick Report', `${selectedModule}_quick_report.xlsx`);
  };

  const handleExportPDF = () => {
    if (!resultData?.rows.length) return;
    exportPDF(resultData.rows, `${activeQuestion.title}`, `${selectedModule}_quick_report.pdf`);
  };

  return (
    <DashboardLayout active="Report Builder" title="Quick Report Wizard">
      <div className="space-y-6 pb-12">
        {/* Header Layout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/report-builder')}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Quick Report Wizard
                </h1>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold">
                  Preset Mode
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate standard logistics reports in 3 easy steps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInAdvanced}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Customize in Advanced Builder
            </button>
          </div>
        </div>

        {/* 3 Step Controls Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {/* Step 1: Select Module */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Step 1: Choose Primary Module
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedModule === p.moduleKey;
                return (
                  <button
                    key={p.moduleKey}
                    onClick={() => {
                      setSelectedModule(p.moduleKey);
                      setSelectedQuestionId(p.questions[0].id);
                    }}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-orange-50/80 border-[#E8450F] text-[#E8450F] font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[#E8450F]' : 'text-slate-400'}`} />
                    <span className="text-xs">{p.moduleLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Choose Question */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Step 2: Choose Report Question
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeModuleObj.questions.map((q) => {
                const isSelected = selectedQuestionId === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestionId(q.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-50/60 border-amber-400 text-slate-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <h4 className="text-xs font-bold mb-0.5">{q.title}</h4>
                    <p className="text-[11px] text-slate-500">{q.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Choose Time Range */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Step 3: Select Time Period
              </label>
              <div className="flex flex-wrap gap-2">
                {TIME_RANGES.map((r) => {
                  const isSelected = selectedTimeRange === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedTimeRange(r.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-colors ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="py-2.5 px-6 bg-[#E8450F] hover:bg-[#c43809] text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 self-end sm:self-center"
            >
              <Zap className="w-4 h-4" /> Generate Quick Report
            </button>
          </div>
        </div>

        {/* Results Area */}
        {executedSpec && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Report Results</h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 inline mr-1" /> CSV
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors shadow-sm"
                >
                  Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition-colors shadow-sm"
                >
                  PDF
                </button>
                <button
                  onClick={() => refetch()}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 animate-pulse bg-white rounded-2xl border border-slate-200">
                Running query against backend report engine...
              </div>
            ) : isError ? (
              <div className="p-6 text-xs bg-red-50 text-red-600 border border-red-200 rounded-2xl">
                {(error as any)?.response?.data?.error?.message || (error as any)?.message || 'Query error'}
              </div>
            ) : resultData ? (
              <div className="space-y-4">
                {/* KPIs Row */}
                {Object.keys(resultData.kpis).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(resultData.kpis).map(([k, val]) => (
                      <KpiCard
                        key={k}
                        title={k.replace(/_/g, ' ').toUpperCase()}
                        value={typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(val)}
                        subtitle={`Calculated from ${resultData.meta.rowCount} records`}
                        variant="amber"
                      />
                    ))}
                  </div>
                )}

                {/* Ledger Data Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-500">
                    <span>Records: {resultData.meta.rowCount}</span>
                    {resultData.meta.truncated && (
                      <span className="text-amber-600">Result truncated to 5,000 max records</span>
                    )}
                  </div>

                  <DataTable
                    columns={
                      resultData.rows.length > 0
                        ? Object.keys(resultData.rows[0]).map((col) => ({
                            header: col.replace(/_/g, ' ').toUpperCase(),
                            accessor: (row: any) => {
                              const val = row[col];
                              if (val === null || val === undefined) return '—';
                              if (typeof val === 'number') return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
                              return String(val);
                            },
                          }))
                        : []
                    }
                    data={resultData.rows}
                    emptyTitle="No data matched"
                    emptyMessage="Try adjusting the time period or question filters."
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
