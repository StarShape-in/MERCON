import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Truck,
  SlidersHorizontal,
  Download,
  RotateCw,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportsHeaderProps {
  activeTab: 'overview' | 'revenue' | 'fleet' | 'custom' | 'delays';
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onExport?: () => void;
}

export default function ReportsHeader({
  activeTab,
  onRefresh,
  isRefreshing = false,
  onExport
}: ReportsHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, path: '/reports' },
    { id: 'revenue', label: 'Revenue Report', icon: TrendingUp, path: '/reports/revenue' },
    { id: 'fleet', label: 'Fleet Performance', icon: Truck, path: '/reports/fleet' },
    { id: 'delays', label: 'Delay Report', icon: Clock, path: '/reports/delays' },
    { id: 'custom', label: 'Custom Generator', icon: SlidersHorizontal, path: '/reports/custom' },
  ];

  return (
    <div className="space-y-4 mb-4">
      {/* Top Scope & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Reports & Intelligence
          </h1>
        </div>

        <div className="flex items-center gap-2">

          <Button 
            size="sm" 
            onClick={onExport}
            className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs rounded-md px-3.5"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Unified Navigation Switcher Bar */}
      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto border border-slate-200/80 dark:border-slate-700/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-800' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
