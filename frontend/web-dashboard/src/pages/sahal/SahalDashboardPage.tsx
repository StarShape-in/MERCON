import { useState } from 'react';
import {
  Download,
  Plus,
  RefreshCw,
  Sparkles,
  Building2,
  TrendingUp,
  Truck,
  Gauge,
  ShieldCheck,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CreateTripModal from '@/components/trips/CreateTripModal';

// Sahal Core Components
import SahalFinancialChart from '@/components/sahal/SahalFinancialChart';
import SahalActionRequired from '@/components/sahal/SahalActionRequired';
import SahalDocumentsCard from '@/components/sahal/SahalDocumentsCard';
import SahalFleetEfficiency from '@/components/sahal/SahalFleetEfficiency';
import SahalLiveOperations from '@/components/sahal/SahalLiveOperations';
import SahalUpcomingDispatches from '@/components/sahal/SahalUpcomingDispatches';

export default function SahalDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHub, setSelectedHub] = useState('All Saudi Hubs');
  const [period, setPeriod] = useState('This Month');
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated('Just now');
      toast.success('Sahal intelligence data synchronized');
    }, 600);
  };

  const handleExport = () => {
    toast.success('Exporting Sahal Executive Summary (CSV)...');
  };

  return (
    <DashboardLayout
      active="/sahal"
      title="Sahal Dashboard"
      pageTitle={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Scope Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 select-none">
              <Building2 size={13} className="text-[#E8450F]" />
              <span>MERCON Logistics</span>
              <span className="text-slate-400">↕</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sahal Dashboard
            </h1>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-semibold px-2.5 py-0.5 text-xs flex items-center gap-1">
            <Sparkles size={11} className="text-emerald-600 dark:text-emerald-400" />
            Sahal Intelligence
          </Badge>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="hidden md:block text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#E8450F]"
          >
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Q3 2026">Q3 2026</option>
          </select>

          {/* Export button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-xs cursor-pointer"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Primary Action */}
          <button
            onClick={() => setIsCreateTripOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#E8450F] text-white hover:bg-[#C7380A] transition-all shadow-sm shadow-[#E8450F]/20 cursor-pointer"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>New Trip</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            title={`Refreshed ${lastUpdated}`}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#E8450F]' : ''} />
          </button>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
        {/* Top KPI Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Net Profit Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <span>Net Profit Yield</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              SAR 184,250
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                ↑ +18.4%
              </span>
              <span className="text-slate-400">vs target margin</span>
            </div>
          </div>

          {/* Active Dispatches */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700/60 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <span>Active Dispatches</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Truck size={16} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              18 Live Trips
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-blue-600 dark:text-blue-400 font-bold">94.4% On Schedule</span>
            </div>
          </div>

          {/* Fleet Efficiency */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <span>Fleet Efficiency</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Gauge size={16} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              92.4% Score
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">3.4 km/L</span>
              <span className="text-slate-400">fuel avg</span>
            </div>
          </div>

          {/* Compliance Status */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-teal-300 dark:hover:border-teal-700/60 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <span>Compliance Health</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              96% Verified
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-amber-600 dark:text-amber-400 font-bold">2 Expiring Soon</span>
            </div>
          </div>
        </div>

        {/* ─── Main 6-Box Concept Layout (From User Architecture Sketch) ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left & Center 8-Column Area */}
          <div className="lg:col-span-8 space-y-5">
            {/* Top Row: Box 1 (Revenue/Expense/Net Profit Graph) + Box 2 (Action Required) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Box 1: Revenue / Expense / Net Profit Graph */}
              <SahalFinancialChart />

              {/* Box 2: Action Required */}
              <SahalActionRequired />
            </div>

            {/* Bottom Row: Box 3 (Doc) + Box 4 (Fleet Efficiency) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Box 3: Documents & Compliance ("Doc") */}
              <SahalDocumentsCard />

              {/* Box 4: Fleet Efficiency */}
              <SahalFleetEfficiency />
            </div>
          </div>

          {/* Right 4-Column Area: Box 5 (Live) + Box 6 (Upcoming) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Box 5: Live Operations */}
            <SahalLiveOperations />

            {/* Box 6: Upcoming Dispatches */}
            <SahalUpcomingDispatches />
          </div>
        </div>
      </div>

      {/* Modal for creating a new trip */}
      {isCreateTripOpen && (
        <CreateTripModal
          isOpen={isCreateTripOpen}
          onClose={() => setIsCreateTripOpen(false)}
          onTripCreated={() => {
            setIsCreateTripOpen(false);
            toast.success('Trip created and queued in Sahal module!');
          }}
        />
      )}
    </DashboardLayout>
  );
}
