import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wand2,
  Sparkles,
  Zap,
  SlidersHorizontal,
  RotateCw,
  Download,
  Plus,
  Play,
  Calendar,
  Trash2,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  ChevronRight,
  Search
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { reportBuilderService, SavedReport, ScheduledReport } from '@/services/reportBuilderService';
import { parseNaturalLanguageQuery } from '@/utils/askMerconParser';
import { ScheduleReportModal } from '@/components/report-builder/ScheduleReportModal';
import { downloadCSV } from '@/utils/exportUtils';

export default function ReportBuilderLandingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nlQuery, setNlQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'saved' | 'scheduled'>('saved');
  const [selectedReportForSchedule, setSelectedReportForSchedule] = useState<SavedReport | undefined>(undefined);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const { data: savedReports = [], isLoading: loadingSaved, refetch: refetchSaved } = useQuery({
    queryKey: ['savedReports'],
    queryFn: reportBuilderService.listSavedReports,
  });

  const { data: scheduledReports = [], isLoading: loadingScheduled, refetch: refetchScheduled } = useQuery({
    queryKey: ['scheduledReports'],
    queryFn: reportBuilderService.listScheduledReports,
  });

  const handleAskMercon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nlQuery.trim()) return;
    const parsed = parseNaturalLanguageQuery(nlQuery.trim());
    navigate('/report-builder/advanced', { state: { initialSpec: parsed.spec } });
  };

  const handleOpenTemplate = (spec: any) => {
    navigate('/report-builder/advanced', { state: { initialSpec: spec } });
  };

  const handleRunSaved = (report: SavedReport) => {
    navigate('/report-builder/advanced', { state: { initialSpec: report.spec, activeReportId: report.id, reportName: report.name } });
  };

  const handleDeleteSaved = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this saved report?')) {
      await reportBuilderService.deleteSavedReport(id);
      queryClient.invalidateQueries({ queryKey: ['savedReports'] });
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this scheduled report?')) {
      await reportBuilderService.deleteScheduledReport(id);
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] });
    }
  };

  const handleExportSavedList = () => {
    if (!savedReports.length) return;
    const exportData = savedReports.map(r => ({
      Name: r.name,
      Category: r.category,
      Visualization: r.visualization,
      RootModule: r.spec.rootModule,
      CreatedDate: new Date(r.createdAt).toLocaleDateString(),
    }));
    downloadCSV(exportData, 'Saved_Reports_Library.csv');
  };

  const popularTemplates = [
    {
      id: 'driver-perf',
      title: 'Driver Revenue & Performance',
      category: 'Drivers',
      desc: 'Driver trip counts, total earned revenue, and active status.',
      spec: {
        rootModule: 'drivers',
        rows: ['drivers.full_name', 'drivers.status'],
        values: [
          { field: 'trips.revenue', agg: 'sum' },
          { field: 'trips.count', agg: 'sum' },
        ],
      },
    },
    {
      id: 'fleet-maint',
      title: 'Fleet Utilization & Maintenance Costs',
      category: 'Vehicles',
      desc: 'Vehicle mileage, maintenance repair costs, and operational status.',
      spec: {
        rootModule: 'vehicles',
        rows: ['vehicles.plate_number', 'vehicles.asset_type', 'vehicles.status'],
        values: [
          { field: 'maintenance.cost', agg: 'sum' },
          { field: 'trips.revenue', agg: 'sum' },
        ],
      },
    },
    {
      id: 'customer-invoices',
      title: 'Customer Invoice & Outstanding Balances',
      category: 'Customers',
      desc: 'Billed invoices, pending collections, and outstanding customer ledger.',
      spec: {
        rootModule: 'customers',
        rows: ['customers.company_name', 'customers.credit_limit'],
        values: [
          { field: 'invoices.total_amount', agg: 'sum' },
          { field: 'invoices.outstanding', agg: 'sum' },
        ],
      },
    },
    {
      id: 'trip-expenses',
      title: 'Trip Expenses & Financial Net Breakdown',
      category: 'Finance',
      desc: 'Categorized operational expenses, driver payouts, and trip costs.',
      spec: {
        rootModule: 'expenses',
        rows: ['expenses.category', 'expenses.expense_type'],
        values: [
          { field: 'expenses.amount', agg: 'sum' },
        ],
      },
    },
  ];

  const filteredSaved = savedReports.filter(r =>
    r.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <DashboardLayout active="Report Builder" title="Smart Report Builder">
      <div className="space-y-6 pb-12">
        {/* Top Bar Header Layout adhering to UI rules */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>MERCON Logistics</span>
              <span className="text-slate-400">↕</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-[#E8450F]" />
              Smart Report Builder
            </h1>
            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold">
              Analytics & BI Module
            </Badge>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportSavedList}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>

            <button
              onClick={() => navigate('/report-builder/quick')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" /> Quick Report
            </button>

            <button
              onClick={() => navigate('/report-builder/advanced')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#E8450F] hover:bg-[#c43809] rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Advanced Builder
            </button>

            <button
              onClick={() => { refetchSaved(); refetchScheduled(); }}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh Data"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Entry Point Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Quick Report */}
          <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/50 p-5 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                  <Zap className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
                  Fast & Preset
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Quick Report Generator</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Step-by-step wizard for standard fleet management questions. Pick a primary module, question, and time period.
              </p>
            </div>
            <button
              onClick={() => navigate('/report-builder/quick')}
              className="w-full py-2.5 px-4 bg-white hover:bg-amber-100/60 text-slate-800 font-semibold text-xs rounded-xl border border-amber-300/80 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              Start Quick Wizard <ChevronRight className="w-4 h-4 text-amber-600" />
            </button>
          </div>

          {/* Advanced Builder */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-5 rounded-2xl border border-orange-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-[#E8450F] text-white rounded-xl shadow-sm">
                  <SlidersHorizontal className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#E8450F] bg-orange-100/80 px-2 py-0.5 rounded-full">
                  3-Panel Pivot
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Advanced Ad-hoc Builder</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Drag-and-drop workspace across Drivers, Vehicles, Trips, Invoices & Maintenance with live visual previews.
              </p>
            </div>
            <button
              onClick={() => navigate('/report-builder/advanced')}
              className="w-full py-2.5 px-4 bg-[#E8450F] hover:bg-[#c43809] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              Open Advanced Builder <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Ask Mercon */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 p-5 rounded-2xl border border-indigo-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-full">
                  NL Query
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Ask Mercon Assistant</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Type your question in natural language (e.g. "show driver revenue this month").
              </p>
              <form onSubmit={handleAskMercon} className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g. driver revenue and trips..."
                  value={nlQuery}
                  onChange={(e) => setNlQuery(e.target.value)}
                  className="w-full text-xs bg-white border border-indigo-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 shadow-inner"
                />
              </form>
            </div>
            <button
              onClick={() => handleAskMercon()}
              disabled={!nlQuery.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm mt-3"
            >
              Ask Mercon <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Popular Templates Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#E8450F]" />
              Popular Pre-built Templates
            </h2>
            <span className="text-xs text-slate-500">Click any template to customize</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => handleOpenTemplate(tmpl.spec)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-[#E8450F] hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {tmpl.category}
                    </span>
                    <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#E8450F] transition-colors" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#E8450F] transition-colors mb-1">
                    {tmpl.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {tmpl.desc}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-3 text-[11px] font-semibold text-[#E8450F] flex items-center gap-1">
                  Launch Spec <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved & Scheduled Reports Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('saved')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${
                  activeTab === 'saved'
                    ? 'bg-[#E8450F] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Report Library ({savedReports.length})
              </button>
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${
                  activeTab === 'scheduled'
                    ? 'bg-[#E8450F] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Scheduled Deliveries ({scheduledReports.length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search report title or category..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#E8450F]"
              />
            </div>
          </div>

          {/* Saved Reports Tab */}
          {activeTab === 'saved' && (
            <div className="overflow-x-auto">
              {loadingSaved ? (
                <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                  Loading report library...
                </div>
              ) : filteredSaved.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No saved reports yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Build a custom query in the Advanced Builder and click "Save Report" to store it here for future execution.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Report Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Primary Module</th>
                      <th className="py-3 px-4">Visualization</th>
                      <th className="py-3 px-4">Last Updated</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {filteredSaved.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {report.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700">
                            {report.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 capitalize font-medium text-slate-700">
                          {report.spec.rootModule}
                        </td>
                        <td className="py-3 px-4 capitalize text-slate-600">
                          {report.visualization || 'table'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(report.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleRunSaved(report)}
                              className="px-2.5 py-1 bg-orange-50 text-[#E8450F] hover:bg-orange-100 rounded-lg text-xs font-semibold flex items-center gap-1 border border-orange-200 transition-colors"
                            >
                              <Play className="w-3 h-3 fill-current" /> Run
                            </button>
                            <button
                              onClick={() => {
                                setSelectedReportForSchedule(report);
                                setScheduleModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-300 transition-colors"
                            >
                              <Calendar className="w-3 h-3" /> Schedule
                            </button>
                            <button
                              onClick={() => handleDeleteSaved(report.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Delete report"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Scheduled Reports Tab */}
          {activeTab === 'scheduled' && (
            <div className="overflow-x-auto">
              {loadingScheduled ? (
                <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                  Loading schedules...
                </div>
              ) : scheduledReports.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No scheduled deliveries</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Schedule automated email or dashboard deliveries for any saved report.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Report Name</th>
                      <th className="py-3 px-4">Frequency</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Recipients</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {scheduledReports.map((sch: ScheduledReport) => (
                      <tr key={sch.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {sch.savedReport?.name || 'Report'}
                        </td>
                        <td className="py-3 px-4 capitalize font-semibold text-slate-700">
                          {sch.frequency}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{sch.time}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {sch.recipients.length > 0 ? sch.recipients.join(', ') : 'All Admins'}
                        </td>
                        <td className="py-3 px-4">
                          {sch.isActive ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-[11px]">
                              <XCircle className="w-3 h-3" /> Paused
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteScheduled(sch.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Cancel schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      <ScheduleReportModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        savedReport={selectedReportForSchedule}
        onScheduled={() => queryClient.invalidateQueries({ queryKey: ['scheduledReports'] })}
      />
    </DashboardLayout>
  );
}
