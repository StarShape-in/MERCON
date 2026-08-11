import { useState } from 'react';
import {
  Download,
  Plus,
  RefreshCw,
  Sparkles,
  Building2,
  TrendingUp,
  Truck,
  Activity,
  MapPin,
  Compass,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CreateTripModal from '@/components/trips/CreateTripModal';

// Sahal Distinct Non-Generic Components
import SahalFinancialChart from '@/components/sahal/SahalFinancialChart';
import SahalActionRequired from '@/components/sahal/SahalActionRequired';
import SahalDocumentsCard from '@/components/sahal/SahalDocumentsCard';
import SahalFleetEfficiency from '@/components/sahal/SahalFleetEfficiency';
import SahalLiveOperations from '@/components/sahal/SahalLiveOperations';
import SahalUpcomingDispatches from '@/components/sahal/SahalUpcomingDispatches';

export default function SahalDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
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
    toast.success('Exporting Sahal Intelligence Executive Report (CSV)...');
  };

  return (
    <DashboardLayout
      active="/sahal"
      title="Sahal Dashboard"
      hideBackButton
      pageTitle={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Scope Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-800 dark:text-slate-200 select-none">
              <Building2 size={14} className="text-[#E8450F]" />
              <span>MERCON Logistics</span>
              <span className="text-slate-400">↕</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Sahal Dashboard
            </h1>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black px-2.5 py-1 text-xs flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-500" />
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
            className="hidden md:block text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E8450F]"
          >
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Q3 2026">Q3 2026</option>
          </select>

          {/* Export button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-xs cursor-pointer"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Primary Action */}
          <button
            onClick={() => setIsCreateTripOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black rounded-2xl bg-[#E8450F] text-white hover:bg-[#C7380A] transition-all shadow-md shadow-[#E8450F]/20 cursor-pointer"
          >
            <Plus size={15} className="stroke-[3]" />
            <span>New Trip</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            title={`Refreshed ${lastUpdated}`}
            className="p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#E8450F]' : ''} />
          </button>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-[1650px] mx-auto">
        {/* High-Impact Unified Command Strip (No generic repetitive 4 cards) */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white shadow-lg border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E8450F] to-amber-500 flex items-center justify-center text-white font-black shadow-md shadow-[#E8450F]/30">
              <Compass size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-white">
                  Sahal Executive Command
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SYSTEM ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Kingdom of Saudi Arabia logistics network & autonomous financial engine
              </p>
            </div>
          </div>

          {/* Quick Real-Time Network Pulse */}
          <div className="flex items-center gap-4 sm:gap-6 text-xs divide-x divide-white/10">
            <div className="pr-4">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold block">
                Net Operating Yield
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                SAR 184,250 <span className="text-xs text-emerald-300 font-sans font-bold">(+18.4%)</span>
              </span>
            </div>

            <div className="pl-4 pr-4">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold block">
                Active Freight Movement
              </span>
              <span className="text-base sm:text-lg font-black text-blue-400 font-mono">
                18 Trucks <span className="text-xs text-slate-300 font-sans font-normal">(94.4% SLA)</span>
              </span>
            </div>

            <div className="hidden lg:block pl-4">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold block">
                Hub Network Status
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                  ● RUH (Normal)
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                  ● JED (Clear)
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-mono text-[11px]">
                  ● DMM (High Traffic)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main 6-Box Concept Layout (From User Architecture Sketch) ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left & Center 8-Column Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Top Row: Box 1 (Revenue/Expense/Net Profit Graph) + Box 2 (Action Required) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Revenue / Expense / Net Profit Cockpit */}
              <SahalFinancialChart />

              {/* Box 2: Priority Dispatch Queue */}
              <SahalActionRequired />
            </div>

            {/* Bottom Row: Box 3 (Doc) + Box 4 (Fleet Efficiency) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 3: Compliance Vault */}
              <SahalDocumentsCard />

              {/* Box 4: Fleet Telemetry Engine */}
              <SahalFleetEfficiency />
            </div>
          </div>

          {/* Right 4-Column Area: Box 5 (Live) + Box 6 (Upcoming) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Box 5: Tactical Live Radar & Route Map */}
            <SahalLiveOperations />

            {/* Box 6: Flight-Board Queue */}
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
