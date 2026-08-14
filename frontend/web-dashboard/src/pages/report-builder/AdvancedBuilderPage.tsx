import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SlidersHorizontal,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Play,
  Save,
  Calendar,
  RotateCw,
  Download,
  Table as TableIcon,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Sparkles,
  ChevronDown,
  ChevronRight,
  GripVertical,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import KpiCard from '@/components/ui/KpiCard';
import DataTable from '@/components/ui/DataTable';
import {
  reportBuilderService,
  ReportModule,
  ReportField,
  ReportQuerySpec,
  ReportResult,
  ReportFilter,
  ReportValueSpec,
  SavedReport,
} from '@/services/reportBuilderService';
import { FilterBuilder } from '@/components/report-builder/FilterBuilder';
import { SaveReportModal } from '@/components/report-builder/SaveReportModal';
import { ScheduleReportModal } from '@/components/report-builder/ScheduleReportModal';
import { downloadCSV, exportExcel, exportPDF } from '@/utils/exportUtils';

const CHART_COLORS = ['#E8450F', '#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6'];

/* Draggable Field Item in Data Panel */
const DraggableFieldItem: React.FC<{
  field: ReportField;
  onAddField: (fieldKey: string, target: 'rows' | 'values') => void;
}> = ({ field, onAddField }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `field-${field.key}`,
    data: { fieldKey: field.key, type: field.type },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;

  const isNumeric = field.type === 'number' || field.type === 'money';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-white hover:border-[#E8450F] hover:shadow-2xs transition-all cursor-grab active:cursor-grabbing text-xs group"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${isNumeric ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
          {field.type === 'money' ? '$' : field.type === 'number' ? '#' : field.type === 'date' ? 'Date' : 'Aa'}
        </span>
        <span className="font-medium text-slate-800 truncate">{field.label}</span>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddField(field.key, 'rows');
          }}
          className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
          title="Add to Rows"
        >
          +Row
        </button>
        {isNumeric && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddField(field.key, 'values');
            }}
            className="px-1.5 py-0.5 text-[10px] bg-orange-50 hover:bg-orange-100 text-[#E8450F] rounded font-semibold cursor-pointer"
            title="Add to Values"
          >
            +Val
          </button>
        )}
      </div>
    </div>
  );
};

/* Droppable Zone Component */
const DroppableZone: React.FC<{
  id: string;
  title: string;
  badge?: string;
  children: React.ReactNode;
}> = ({ id, title, badge, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`p-3.5 rounded-2xl border transition-all ${
        isOver ? 'border-[#E8450F] bg-orange-50/40 shadow-xs' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">{title}</h4>
        {badge && (
          <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-600 border-slate-200">
            {badge}
          </Badge>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
};

export default function AdvancedBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Sensors for DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Schema state
  const { data: schemaModules = [], isLoading: loadingSchema } = useQuery({
    queryKey: ['reportSchema'],
    queryFn: reportBuilderService.getSchema,
  });

  // Location state (initial spec passed from Quick Report / Ask Mercon / Templates)
  const initialSpec: ReportQuerySpec | undefined = location.state?.initialSpec;
  const initialActiveReportId: string | undefined = location.state?.activeReportId;
  const initialReportName: string | undefined = location.state?.reportName;

  // Query spec state
  const [rootModule, setRootModule] = useState<string>(initialSpec?.rootModule || 'trips');
  const [rows, setRows] = useState<string[]>(initialSpec?.rows || ['trips.trip_number']);
  const [columns, setColumns] = useState<string[]>(initialSpec?.columns || []);
  const [values, setValues] = useState<ReportValueSpec[]>(
    initialSpec?.values || [{ field: 'trips.revenue', agg: 'sum' }]
  );
  const [filters, setFilters] = useState<ReportFilter[]>(initialSpec?.filters || []);
  const [visualization, setVisualization] = useState<string>('table');
  const [fieldSearch, setFieldSearch] = useState('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    drivers: true,
    vehicles: true,
    trips: true,
  });

  // Modal states
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<SavedReport | undefined>(undefined);

  // Sync state if initialSpec changes via navigation
  useEffect(() => {
    if (initialSpec) {
      if (initialSpec.rootModule) setRootModule(initialSpec.rootModule);
      if (initialSpec.rows) setRows(initialSpec.rows);
      if (initialSpec.columns) setColumns(initialSpec.columns);
      if (initialSpec.values) setValues(initialSpec.values);
      if (initialSpec.filters) setFilters(initialSpec.filters);
    }
  }, [initialSpec]);

  const activeModuleObj = schemaModules.find((m) => m.key === rootModule);

  // Flattened list of all available fields from schema
  const allSchemaFields: ReportField[] = schemaModules.flatMap((m) => m.fields);

  // Build full QuerySpec for execution
  const currentQuerySpec: ReportQuerySpec = {
    rootModule,
    rows,
    columns,
    values,
    filters,
  };

  // Run Report Query API hook
  const {
    data: queryResult,
    isLoading: querying,
    isError,
    error,
    refetch,
  } = useQuery<ReportResult>({
    queryKey: ['reportEngineQuery', currentQuerySpec],
    queryFn: () => reportBuilderService.runQuery(currentQuerySpec),
    enabled: schemaModules.length > 0 && rows.length > 0,
  });

  // Check if multiple modules are connected
  const referencedModules = new Set<string>();
  [...rows, ...columns, ...values.map((v) => v.field), ...filters.map((f) => f.field)].forEach((key) => {
    const mod = key.split('.')[0];
    if (mod) referencedModules.add(mod);
  });
  const isMultiModule = referencedModules.size > 1;

  // Add field handler
  const handleAddField = (fieldKey: string, target: 'rows' | 'values' | 'columns') => {
    if (target === 'rows') {
      if (!rows.includes(fieldKey)) setRows([...rows, fieldKey]);
    } else if (target === 'columns') {
      if (!columns.includes(fieldKey)) setColumns([...columns, fieldKey]);
    } else if (target === 'values') {
      if (!values.some((v) => v.field === fieldKey)) {
        setValues([...values, { field: fieldKey, agg: 'sum' }]);
      }
    }
  };

  // Drag & drop end handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const fieldKey = (active.data.current as any)?.fieldKey;
    if (!fieldKey) return;

    const destination = over.id as string;
    if (destination === 'rows') {
      handleAddField(fieldKey, 'rows');
    } else if (destination === 'columns') {
      handleAddField(fieldKey, 'columns');
    } else if (destination === 'values') {
      handleAddField(fieldKey, 'values');
    }
  };

  const handleRemoveRow = (key: string) => setRows(rows.filter((r) => r !== key));
  const handleRemoveColumn = (key: string) => setColumns(columns.filter((c) => c !== key));
  const handleRemoveValue = (key: string) => setValues(values.filter((v) => v.field !== key));

  const handleAggChange = (fieldKey: string, agg: any) => {
    setValues(values.map((v) => (v.field === fieldKey ? { ...v, agg } : v)));
  };

  const handleClearAll = () => {
    setRows([]);
    setColumns([]);
    setValues([]);
    setFilters([]);
  };

  const toggleModuleExpand = (modKey: string) => {
    setExpandedModules((prev) => ({ ...prev, [modKey]: !prev[modKey] }));
  };

  // Export handlers
  const handleExportCSV = () => {
    if (!queryResult?.rows.length) return;
    downloadCSV(queryResult.rows, `${rootModule}_adhoc_report.csv`);
  };

  const handleExportExcel = () => {
    if (!queryResult?.rows.length) return;
    exportExcel(queryResult.rows, 'Ad-hoc Report', `${rootModule}_adhoc_report.xlsx`);
  };

  const handleExportPDF = () => {
    if (!queryResult?.rows.length) return;
    exportPDF(queryResult.rows, `Ad-hoc Report (${rootModule})`, `${rootModule}_adhoc_report.pdf`);
  };

  // Chart data prep
  const chartData = (queryResult?.rows || []).slice(0, 30);
  const primaryDimension = rows[0] || 'dimension';
  const primaryMetric = values[0]?.field || 'value';

  return (
    <DashboardLayout active="Report Builder" title="Advanced Report Builder">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto space-y-6 pb-12">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/report-builder')}
                className="text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-[#E8450F]" />
                    {initialReportName || 'Advanced Ad-hoc Builder'}
                  </h1>
                  <Badge className="bg-orange-50 text-[#E8450F] border-orange-200 font-semibold">
                    Interactive Pivot
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compose custom cross-module reports with real-time Prisma engine resolution.
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Clear Workspace
              </Button>

              <Button
                size="sm"
                onClick={() => setSaveModalOpen(true)}
                className="gap-1.5 text-xs font-semibold bg-[#E8450F] hover:bg-[#c43809] text-white shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" /> Save Report
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setScheduleModalOpen(true)}
                className="gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              >
                <Calendar className="w-3.5 h-3.5" /> Schedule
              </Button>
            </div>
          </div>

          {/* 3-Panel Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel 1: Left Data Panel (3 Cols) */}
            <Card className="lg:col-span-3 border-slate-200 shadow-xs max-h-[calc(100vh-140px)] overflow-hidden flex flex-col">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">Data Fields</CardTitle>
                  <CardDescription className="text-[11px] text-slate-400 font-medium">{allSchemaFields.length} available</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 overflow-y-auto flex-1">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Filter fields..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    className="text-xs pl-8 bg-slate-50 border-slate-200"
                  />
                </div>

                {/* Module Accordions */}
                {loadingSchema ? (
                  <div className="p-4 text-center text-xs text-slate-400 animate-pulse">Loading schema...</div>
                ) : (
                  <div className="space-y-3">
                    {schemaModules.map((mod) => {
                      const isExpanded = expandedModules[mod.key] ?? false;
                      const matchingFields = mod.fields.filter(
                        (f) =>
                          f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
                          f.key.toLowerCase().includes(fieldSearch.toLowerCase())
                      );
                      if (fieldSearch && matchingFields.length === 0) return null;

                      return (
                        <div key={mod.key} className="border border-slate-200/80 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleModuleExpand(mod.key)}
                            className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                          >
                            <span>{mod.label}</span>
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                          </button>

                          {isExpanded && (
                            <div className="p-2 space-y-1.5 bg-white">
                              {matchingFields.map((field) => (
                                <DraggableFieldItem key={field.key} field={field} onAddField={handleAddField} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Panel 2: Center Structure Builder (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Primary Module Selector & Auto-Connect Badge */}
              <Card className="border-slate-200 shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Primary Root Module</label>
                    {isMultiModule && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Connected automatically
                      </Badge>
                    )}
                  </div>

                  <select
                    value={rootModule}
                    onChange={(e) => setRootModule(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E8450F]"
                  >
                    {schemaModules.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label} ({m.key})
                      </option>
                    ))}
                  </select>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    Sets the primary driving entity for row generation and automatically joins 1-hop related data.
                  </p>
                </CardContent>
              </Card>

              {/* Rows Droppable Zone */}
              <DroppableZone id="rows" title="Rows (Dimensions)" badge={`${rows.length} fields`}>
                {rows.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-3 text-center border border-dashed border-slate-200 rounded-xl">
                    Drag fields here or click +Row
                  </div>
                ) : (
                  rows.map((key) => {
                    const f = allSchemaFields.find((sf) => sf.key === key);
                    return (
                      <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="font-semibold text-slate-800">{f?.label || key}</span>
                        <button onClick={() => handleRemoveRow(key)} className="text-slate-400 hover:text-red-500 p-1 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </DroppableZone>

              {/* Values Droppable Zone */}
              <DroppableZone id="values" title="Values (Metrics & Aggregations)" badge={`${values.length} metrics`}>
                {values.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-3 text-center border border-dashed border-slate-200 rounded-xl">
                    Drag numeric fields here or click +Val
                  </div>
                ) : (
                  values.map((v) => {
                    const f = allSchemaFields.find((sf) => sf.key === v.field);
                    return (
                      <div key={v.field} className="flex items-center justify-between p-2 bg-orange-50/50 rounded-xl border border-orange-200 text-xs">
                        <span className="font-bold text-[#E8450F]">{f?.label || v.field}</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={v.agg}
                            onChange={(e) => handleAggChange(v.field, e.target.value)}
                            className="text-[11px] font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5"
                          >
                            <option value="sum">Sum</option>
                            <option value="avg">Avg</option>
                            <option value="min">Min</option>
                            <option value="max">Max</option>
                            <option value="count">Count</option>
                          </select>
                          <button onClick={() => handleRemoveValue(v.field)} className="text-slate-400 hover:text-red-500 p-1 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </DroppableZone>

              {/* Filters Zone */}
              <Card className="border-slate-200 shadow-xs p-3.5 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Filters</h4>
                <FilterBuilder filters={filters} onChange={setFilters} availableFields={allSchemaFields} />
              </Card>
            </div>

            {/* Panel 3: Right Live Preview & Visualization (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Header & Visualization Switcher */}
              <Card className="border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Live Preview</h3>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold">
                    Active
                  </Badge>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: 'table', icon: TableIcon, label: 'Table' },
                    { id: 'bar', icon: BarChart3, label: 'Bar' },
                    { id: 'line', icon: LineChartIcon, label: 'Line' },
                    { id: 'pie', icon: PieChartIcon, label: 'Pie' },
                    { id: 'area', icon: AreaChartIcon, label: 'Area' },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isActive = visualization === mode.id;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setVisualization(mode.id)}
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          isActive ? 'bg-white text-[#E8450F] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title={mode.label}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={handleExportCSV} className="h-7 text-xs font-semibold">
                    CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportExcel} className="h-7 text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100">
                    Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportPDF} className="h-7 text-xs font-semibold text-red-700 bg-red-50 border-red-200 hover:bg-red-100">
                    PDF
                  </Button>
                </div>
              </Card>

              {/* Execution State */}
              {querying ? (
                <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 animate-pulse">
                  Querying database report engine...
                </div>
              ) : isError ? (
                <div className="p-5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Report Engine Error: </span>
                    {(error as any)?.response?.data?.error?.message || (error as any)?.message || 'Invalid query configuration'}
                  </div>
                </div>
              ) : queryResult ? (
                <div className="space-y-4">
                  {/* KPI Cards Row */}
                  {Object.keys(queryResult.kpis).length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(queryResult.kpis).map(([k, val]) => (
                        <KpiCard
                          key={k}
                          title={k.replace(/_/g, ' ').toUpperCase()}
                          value={typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(val)}
                          variant="amber"
                        />
                      ))}
                    </div>
                  )}

                  {/* Visualization Canvas */}
                  {visualization !== 'table' && chartData.length > 0 && (
                    <Card className="border-slate-200 shadow-xs p-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {visualization === 'bar' ? (
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey={primaryDimension} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RechartsTooltip />
                            <Bar dataKey={primaryMetric} fill="#E8450F" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : visualization === 'line' ? (
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey={primaryDimension} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey={primaryMetric} stroke="#E8450F" strokeWidth={2} />
                          </LineChart>
                        ) : visualization === 'pie' ? (
                          <PieChart>
                            <RechartsTooltip />
                            <Pie data={chartData} dataKey={primaryMetric} nameKey={primaryDimension} cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                              {chartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        ) : (
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey={primaryDimension} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RechartsTooltip />
                            <Area type="monotone" dataKey={primaryMetric} stroke="#E8450F" fill="#ffedd5" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* Data Table Canvas */}
                  <Card className="border-slate-200 shadow-xs p-4">
                    <DataTable
                      columns={
                        queryResult.rows.length > 0
                          ? Object.keys(queryResult.rows[0]).map((col) => ({
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
                      data={queryResult.rows}
                      emptyTitle="No records found"
                      emptyMessage="Drag dimensions and values to inspect report rows."
                    />
                  </Card>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </DndContext>

      <SaveReportModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        spec={currentQuerySpec}
        visualization={visualization}
        onSaved={() => navigate('/report-builder')}
      />

      <ScheduleReportModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        savedReport={activeReport}
        onScheduled={() => navigate('/report-builder')}
      />
    </DashboardLayout>
  );
}
