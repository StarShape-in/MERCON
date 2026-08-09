import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, Truck, 
  Wrench, FileSpreadsheet, RefreshCw, AlertTriangle, Calendar
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { vehicleService } from '@/services/vehicleService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataTable from '@/components/ui/DataTable';
import { exportExcelTable } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';

export default function VehicleFinancialsPage() {
  const { id: urlId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch all vehicles for the dropdown selector
  const { data: vehiclesRes, isLoading: isVehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll({ per_page: 100 }),
  });

  const vehiclesList = vehiclesRes?.data || [];

  // Selected vehicle state (defaults to URL id, or first vehicle in roster)
  const [selectedId, setSelectedId] = useState<string>(urlId || '');

  useEffect(() => {
    if (urlId) {
      setSelectedId(urlId);
    } else if (vehiclesList.length > 0 && !selectedId) {
      setSelectedId(vehiclesList[0].id);
    }
  }, [urlId, vehiclesList]);

  const handleVehicleChange = (newId: string) => {
    setSelectedId(newId);
    navigate(`/vehicles/${newId}/financials`, { replace: true });
  };

  // Queries for selected vehicle
  const { data: vehicle, isLoading: isVehicleLoading } = useQuery({
    queryKey: ['vehicle', selectedId],
    queryFn: () => vehicleService.getById(selectedId),
    enabled: !!selectedId,
  });

  const { data: financials, isLoading: isFinancialsLoading, refetch: refetchFinancials } = useQuery({
    queryKey: ['vehicle-financials', selectedId],
    queryFn: () => vehicleService.getFinancials(selectedId),
    enabled: !!selectedId,
  });

  const handleExportExcel = () => {
    if (!financials || !vehicle) return;

    const incomeRows = financials.income_sources.map((t) => [
      t.ref_id || 'TRIP',
      t.customer_name,
      'Completed Trip',
      `+SAR ${t.income.toLocaleString()}`,
    ]);

    const expenseRows = financials.expense_records.map((m) => [
      m.maintenance_type,
      m.workshop_name,
      m.start_date ? new Date(m.start_date).toLocaleDateString() : 'N/A',
      `-SAR ${(m.cost || 0).toLocaleString()}`,
    ]);

    exportExcelTable(
      `MERCON Fleet - Vehicle P&L Statement (${vehicle.plate_number})`,
      ['Reference / Type', 'Party / Workshop', 'Details / Date', 'Amount (SAR)'],
      [
        ['--- INCOME SOURCES ---', '', '', ''],
        ...incomeRows,
        ['--- MAINTENANCE EXPENSES ---', '', '', ''],
        ...expenseRows,
        ['', '', 'NET VEHICLE PROFIT:', `SAR ${financials.summary.net_profit.toLocaleString()}`],
      ],
      `Vehicle_P&L_${vehicle.plate_number}.xlsx`
    );
  };

  if (isVehiclesLoading || isVehicleLoading) {
    return (
      <DashboardLayout active="Vehicles" title="Vehicle Financials P&L">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full space-y-5 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout active="Vehicles" title="Vehicle Profit & Loss (P&L) Report">
      <div className="px-4 sm:px-6 pb-6 space-y-6 animate-fade-in max-w-[1400px] mx-auto w-full">

        {/* ── Top Bar Header & Controls ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(selectedId ? `/vehicles/${selectedId}` : '/vehicles')}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              title="Back to Vehicle Overview"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Vehicle Profit & Loss (P&L) Report
                </h1>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[11px]">
                  Financials
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Detailed statement of revenue income vs operational service expenses per truck asset.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Vehicle Selector Dropdown */}
            {vehiclesList.length > 0 && (
              <Select value={selectedId} onValueChange={handleVehicleChange}>
                <SelectTrigger className="h-9 text-xs font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-w-[180px]">
                  <Truck className="w-3.5 h-3.5 mr-1.5 text-indigo-500 shrink-0" />
                  <SelectValue placeholder="Select Vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehiclesList.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs font-medium">
                      🚚 {v.plate_number} ({v.asset_type || 'Truck'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchFinancials()}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={!financials}
              className="h-9 gap-1.5 text-xs font-semibold border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* ── Vehicle Identity Banner ────────────────────────────────────── */}
        {vehicle && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {vehicle.plate_number}
                  </h2>
                  {vehicle.asset_type && (
                    <Badge className="bg-[#FFF0EB] text-[#E8450F] border-[#E8450F]/30 text-[10px] font-bold">
                      {vehicle.asset_type}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  Ref ID: <span className="font-bold text-slate-700 dark:text-slate-300">{vehicle.ref_id || `VEH-${vehicle.id.slice(0, 6).toUpperCase()}`}</span> • Odometer: {(vehicle.current_odometer ?? 0).toLocaleString()} km
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/vehicles/${vehicle.id}`)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            >
              View Full Vehicle Details →
            </Button>
          </div>
        )}

        {/* ── 4 KPI Financial Cards ─────────────────────────────────────── */}
        {isFinancialsLoading ? (
          <div className="py-8 text-center text-slate-400 animate-pulse text-xs font-semibold">
            Calculating P&L metrics...
          </div>
        ) : financials ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Gross Income */}
              <Card className="border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Income Generated</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-mono font-extrabold text-emerald-700 dark:text-emerald-300 mt-2">
                  SAR {financials.summary.total_income.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  {financials.summary.completed_trips_count} completed trip dispatches
                </div>
              </Card>

              {/* Total Expenses */}
              <Card className="border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400">Total Maintenance Expenses</span>
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-mono font-extrabold text-rose-700 dark:text-rose-300 mt-2">
                  SAR {financials.summary.total_expenses.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  {financials.summary.total_maintenance_count} workshop service & renewal records
                </div>
              </Card>

              {/* Net Profit */}
              <Card className="border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Net Vehicle Profit</span>
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                </div>
                <div className={cn(
                  "text-2xl font-mono font-extrabold mt-2",
                  financials.summary.net_profit >= 0 ? "text-indigo-700 dark:text-indigo-300" : "text-rose-600"
                )}>
                  SAR {financials.summary.net_profit.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  Gross Revenue - Maintenance Costs
                </div>
              </Card>

              {/* Profit Margin % */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Profit Margin %</span>
                  <Badge variant="outline" className="text-[10px] font-bold">Margin</Badge>
                </div>
                <div className="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-2 flex items-center gap-1.5">
                  {financials.summary.margin_percent >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                  )}
                  <span>{financials.summary.margin_percent}%</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  Operational Asset Margin
                </div>
              </Card>

            </div>

            {/* ── 2 Detailed Itemized Ledgers ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Trip Revenue Ledger */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> Itemized Trip Revenue Ledger
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Income generated from completed trip freight runs for this vehicle.
                    </CardDescription>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    {financials.income_sources.length} TRIPS
                  </Badge>
                </CardHeader>

                <CardContent className="p-0">
                  {financials.income_sources.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium italic">
                      No completed trip revenue recorded for this vehicle yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                      {financials.income_sources.map((trip) => (
                        <div key={trip.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {trip.customer_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Ref: {trip.ref_id || 'TRIP'}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                              +SAR {trip.income.toLocaleString()}
                            </span>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-500 font-semibold">
                              Completed
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Maintenance & Renewal Expense Ledger */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-rose-600" /> Maintenance & Service Expense Ledger
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Itemized maintenance, workshop repairs, and renewal costs.
                    </CardDescription>
                  </div>
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                    {financials.expense_records.length} LOGS
                  </Badge>
                </CardHeader>

                <CardContent className="p-0">
                  {financials.expense_records.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium italic">
                      No maintenance expense logs recorded for this vehicle yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                      {financials.expense_records.map((maint) => (
                        <div key={maint.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{maint.workshop_name}</span>
                              <Badge variant="outline" className="text-[9px] font-semibold">
                                {maint.maintenance_type}
                              </Badge>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {maint.work_done || maint.remarks || 'Standard Service Work'}
                              {maint.start_date && ` • ${new Date(maint.start_date).toLocaleDateString()}`}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono font-extrabold text-xs text-rose-600 dark:text-rose-400">
                              -SAR {(maint.cost || 0).toLocaleString()}
                            </span>
                            {maint.invoice_number && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Inv: {maint.invoice_number}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <AlertTriangle size={32} className="text-amber-500 opacity-60" />
            <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">No Vehicle Selected</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Please select a truck asset from the dropdown roster above to view its Profit & Loss statement.
            </p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
