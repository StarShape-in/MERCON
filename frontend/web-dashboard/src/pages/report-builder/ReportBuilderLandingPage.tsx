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
  ChevronRight,
  Search
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { reportBuilderService, SavedReport, ScheduledReport } from '@/services/reportBuilderService';
import { parseNaturalLanguageQuery } from '@/utils/askMerconParser';
import { ScheduleReportModal } from '@/components/report-builder/ScheduleReportModal';
import { downloadCSV } from '@/utils/exportUtils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

export default function ReportBuilderLandingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();
  const [nlQuery, setNlQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('saved');
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
      CreatedDate: formatInDeploymentTz(r.createdAt, tz, 'MM/dd/yyyy'),
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
        rows: ['customers.name', 'customers.credit_limit'],
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
        rows: ['expenses.category', 'expenses.payment_method'],
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
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto space-y-6 pb-12">
        {/* Top Bar Header Layout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Wand2 className="w-6 h-6 text-[#E8450F] shrink-0" />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Smart Report Builder
                </h1>
                <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold">
                  Analytics & BI Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Build ad-hoc pivot reports, wizard presets, and natural language analytics across fleet operations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSavedList}
              className="gap-1.5 text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/report-builder/quick')}
              className="gap-1.5 text-xs font-semibold bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" /> Quick Report
            </Button>

            <Button
              size="sm"
              onClick={() => navigate('/report-builder/advanced')}
              className="gap-1.5 text-xs font-semibold bg-[#E8450F] hover:bg-[#c43809] text-white shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Advanced Builder
            </Button>
          </div>
        </div>

        {/* Entry Point Cards - Perfectly Aligned Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Quick Report Card */}
          <Card className="bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-amber-50/20 border-amber-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shadow-2xs">
                  <Zap className="w-5 h-5" />
                </span>
                <Badge className="bg-amber-100/80 text-amber-800 border-amber-200 text-[10px] uppercase tracking-wider font-bold">
                  Fast & Preset
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-slate-900">Quick Report Generator</CardTitle>
              <CardDescription className="text-xs text-slate-600 leading-relaxed mt-1">
                Step-by-step wizard for standard fleet management questions. Pick a primary module, question, and time period.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex-1">
              <div className="text-[11px] text-amber-800/80 bg-amber-100/40 p-2.5 rounded-xl border border-amber-200/50">
                Preset workflows: Driver Revenue, Vehicle Repairs, Outstanding Invoices & Operating Expenses.
              </div>
            </CardContent>
            <CardFooter className="p-5 pt-0">
              <Button
                variant="outline"
                className="w-full text-xs font-semibold bg-white hover:bg-amber-100/60 border-amber-300 text-slate-800 gap-1.5 shadow-2xs cursor-pointer"
                onClick={() => navigate('/report-builder/quick')}
              >
                Start Quick Wizard <ChevronRight className="w-4 h-4 text-amber-600" />
              </Button>
            </CardFooter>
          </Card>

          {/* Advanced Builder Card */}
          <Card className="bg-gradient-to-br from-orange-500/10 via-orange-600/5 to-orange-500/5 border-orange-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-[#E8450F] text-white rounded-xl shadow-2xs">
                  <SlidersHorizontal className="w-5 h-5" />
                </span>
                <Badge className="bg-orange-100 text-[#E8450F] border-orange-200 text-[10px] uppercase tracking-wider font-bold">
                  3-Panel Pivot
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-slate-900">Advanced Ad-hoc Builder</CardTitle>
              <CardDescription className="text-xs text-slate-600 leading-relaxed mt-1">
                Drag-and-drop workspace across Drivers, Vehicles, Trips, Invoices & Maintenance with live visual previews.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex-1">
              <div className="text-[11px] text-orange-900/80 bg-orange-100/40 p-2.5 rounded-xl border border-orange-200/50">
                Custom layout: Droppable Rows, Columns, Values, AND/OR Filters with real-time Prisma queries.
              </div>
            </CardContent>
            <CardFooter className="p-5 pt-0">
              <Button
                className="w-full text-xs font-semibold bg-[#E8450F] hover:bg-[#c43809] text-white gap-1.5 shadow-2xs cursor-pointer"
                onClick={() => navigate('/report-builder/advanced')}
              >
                Open Advanced Builder <ChevronRight className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Ask Mercon Assistant Card */}
          <Card className="bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-indigo-50/20 border-indigo-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shadow-2xs">
                  <Sparkles className="w-5 h-5" />
                </span>
                <Badge className="bg-indigo-100/80 text-indigo-800 border-indigo-200 text-[10px] uppercase tracking-wider font-bold">
                  NL Query
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-slate-900">Ask Mercon Assistant</CardTitle>
              <CardDescription className="text-xs text-slate-600 leading-relaxed mt-1">
                Type your request in plain natural language (e.g. "driver revenue this month").
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex-1">
              <form onSubmit={handleAskMercon}>
                <Input
                  type="text"
                  placeholder="e.g. driver revenue and trips..."
                  value={nlQuery}
                  onChange={(e) => setNlQuery(e.target.value)}
                  className="text-xs bg-white border-indigo-200 focus-visible:ring-indigo-500 shadow-2xs h-9"
                />
              </form>
            </CardContent>
            <CardFooter className="p-5 pt-0">
              <Button
                className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-2xs cursor-pointer"
                disabled={!nlQuery.trim()}
                onClick={() => handleAskMercon()}
              >
                Ask Mercon <Sparkles className="w-3.5 h-3.5" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Popular Templates Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#E8450F]" />
              Popular Pre-built Templates
            </h2>
            <span className="text-xs text-slate-500 font-medium">Click any template to launch & customize</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularTemplates.map((tmpl) => (
              <Card
                key={tmpl.id}
                onClick={() => handleOpenTemplate(tmpl.spec)}
                className="hover:border-[#E8450F] hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between border-slate-200"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border-slate-200">
                      {tmpl.category}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#E8450F] transition-colors" />
                  </div>
                  <CardTitle className="text-xs font-bold text-slate-900 group-hover:text-[#E8450F] transition-colors leading-tight">
                    {tmpl.title}
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 leading-snug pt-1">
                    {tmpl.desc}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="p-4 pt-2 border-t border-slate-100 text-[11px] font-semibold text-[#E8450F] flex items-center justify-between">
                  <span>Launch Spec</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Saved & Scheduled Reports Section */}
        <Card className="border-slate-200 shadow-2xs">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <TabsList className="bg-slate-200/70 p-1">
                <TabsTrigger value="saved" className="text-xs font-bold px-3 py-1 cursor-pointer">
                  Report Library ({savedReports.length})
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="text-xs font-bold px-3 py-1 cursor-pointer">
                  Scheduled Deliveries ({scheduledReports.length})
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search title or category..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="text-xs pl-8 bg-white border-slate-300 h-9"
                />
              </div>
            </div>

            {/* Saved Reports Tab */}
            <TabsContent value="saved" className="m-0">
              <div className="overflow-x-auto">
                {loadingSaved ? (
                  <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                    Loading report library...
                  </div>
                ) : filteredSaved.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <FileSpreadsheet className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No saved reports yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Build a custom query in the Advanced Builder and click "Save Report" to store it here.
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
                            <Badge variant="outline" className="text-[11px] font-medium text-slate-700 bg-slate-100">
                              {report.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 capitalize font-medium text-slate-700">
                            {report.spec.rootModule}
                          </td>
                          <td className="py-3 px-4 capitalize text-slate-600">
                            {report.visualization || 'table'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {formatInDeploymentTz(report.updatedAt, tz, 'MM/dd/yyyy')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleRunSaved(report)}
                                className="h-7 px-2.5 bg-orange-50 text-[#E8450F] hover:bg-orange-100 border border-orange-200 text-xs font-semibold gap-1"
                              >
                                <Play className="w-3 h-3 fill-current" /> Run
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReportForSchedule(report);
                                  setScheduleModalOpen(true);
                                }}
                                className="h-7 px-2.5 text-slate-700 text-xs font-medium gap-1"
                              >
                                <Calendar className="w-3 h-3" /> Schedule
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteSaved(report.id)}
                                className="h-7 w-7 text-slate-400 hover:text-red-600"
                                title="Delete report"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>

            {/* Scheduled Reports Tab */}
            <TabsContent value="scheduled" className="m-0">
              <div className="overflow-x-auto">
                {loadingScheduled ? (
                  <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                    Loading schedules...
                  </div>
                ) : scheduledReports.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <Clock className="w-7 h-7 text-slate-400 shrink-0" />
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
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[11px] gap-1">
                                <XCircle className="w-3 h-3" /> Paused
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteScheduled(sch.id)}
                              className="h-7 w-7 text-slate-400 hover:text-red-600"
                              title="Cancel schedule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
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
