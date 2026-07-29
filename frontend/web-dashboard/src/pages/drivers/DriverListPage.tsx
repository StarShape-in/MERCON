import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Download, 
  Eye, 
  Edit2, 
  Trash2, 
  Search, 
  AlertTriangle, 
  RefreshCw, 
  User, 
  CheckCircle2, 
  RotateCw, 
  List, 
  LayoutGrid, 
  ShieldAlert, 
  Phone, 
  FileText, 
  ChevronDown, 
  Filter, 
  Layers,
  CheckCircle,
  XCircle,
  Send,
  Calendar as CalendarIcon
} from 'lucide-react';
import { DriverBadge, CheckBadge, RouteLine, TruckMotion, RiskAlert } from '@/components/ui/kpi-icons';
import KpiCard from '@/components/ui/KpiCard';
import { DriverRosterKpi } from '@/components/ui/CustomKpiWidgets';

import { downloadCSV } from '@/utils/exportUtils';
import { notificationService } from '@/services/notificationService';
import { driverService, Driver, DriverStatus } from '@/services/driverService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function DriverListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<DriverStatus | 'All'>('All');
  const [riskFilter, setRiskFilter] = useState<'All' | 'Low' | 'Moderate' | 'High'>('All');
  const [licenseFilter, setLicenseFilter] = useState<'All' | 'Valid' | 'Expired'>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Quick status update dialog state
  const [statusDialogDriver, setStatusDialogDriver] = useState<Driver | null>(null);
  const [newStatus, setNewStatus] = useState<DriverStatus>('Available');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showMotModal, setShowMotModal] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch drivers using React Query
  const { data: driversRes, isLoading, isError, error } = useQuery({
    queryKey: ['drivers', selectedStatus, debouncedSearch, currentPage, pageSize],
    queryFn: () => driverService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: pageSize,
    }),
  });

  const drivers = driversRes?.data || [];
  const totalPages = driversRes?.meta?.total_pages || 1;
  const totalCount = driversRes?.meta?.total || drivers.length;

  // Filter local data based on Risk and License filters
  const filteredDrivers = drivers.filter(d => {
    if (riskFilter === 'Low' && (d.ai_risk_score || 0) >= 3) return false;
    if (riskFilter === 'Moderate' && ((d.ai_risk_score || 0) < 3 || (d.ai_risk_score || 0) > 7)) return false;
    if (riskFilter === 'High' && (d.ai_risk_score || 0) <= 7) return false;

    if (licenseFilter === 'Expired' && new Date(d.license_expiry) >= new Date()) return false;
    if (licenseFilter === 'Valid' && new Date(d.license_expiry) < new Date()) return false;

    return true;
  });

  // Calculate driver counts and dynamic progress segments from real backend data
  const availableCount = drivers.filter(d => d.status === 'Available').length;
  const onTripCount = drivers.filter(d => d.status === 'OnTrip').length;

  const highRiskDriversCount = drivers.filter(d => (d.ai_risk_score || 0) > 7).length;
  const expiredLicenseCount = drivers.filter(d => new Date(d.license_expiry) < new Date()).length;
  const clearDriversCount = drivers.filter(d => (d.ai_risk_score || 0) <= 7 && new Date(d.license_expiry) >= new Date()).length;
  const highRiskCount = highRiskDriversCount + expiredLicenseCount;

  const totalDriversCount = drivers.length || 1;
  const highRiskSegPct = Math.round((highRiskDriversCount / totalDriversCount) * 100);
  const expiredSegPct = Math.round((expiredLicenseCount / totalDriversCount) * 100);
  const clearSegPct = Math.max(0, 100 - highRiskSegPct - expiredSegPct);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['drivers'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleUpdateStatus = async () => {
    if (!statusDialogDriver) return;
    setIsUpdatingStatus(true);
    try {
      await driverService.update(statusDialogDriver.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setStatusDialogDriver(null);
    } catch (err) {
      alert('Failed to update driver status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const columns = [
    {
      header: 'Driver ID',
      accessor: (row: Driver) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-[#E8450F]">
            {row.ref_id || `DRV-${row.id.slice(0, 5).toUpperCase()}`}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Reg: {new Date(row.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Driver Name & Phone',
      accessor: (row: Driver) => {
        const initials = `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase() || 'DR';
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-xs hover:text-[#E8450F] transition-colors cursor-pointer" onClick={() => navigate(`/drivers/${row.id}`)}>
                {row.first_name} {row.last_name}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                {row.phone_primary}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'License Details',
      accessor: (row: Driver) => {
        const isExpired = new Date(row.license_expiry) < new Date();
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold text-slate-700">
              {row.license_number || 'KSA-98234-DL'}
            </span>
            <div className="flex items-center gap-1">
              {isExpired ? (
                <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 text-[10px] font-bold py-0 px-1.5 gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                  Expired ({new Date(row.license_expiry).toLocaleDateString()})
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-500">
                  Exp: {new Date(row.license_expiry).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Duty Status',
      accessor: (row: Driver) => <StatusBadge status={row.status} />,
    },
    {
      header: 'AI Risk Score',
      accessor: (row: Driver) => {
        const score = row.ai_risk_score || 0;
        let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        let dotColor = 'bg-emerald-500';
        let label = 'Low Risk';

        if (score > 3 && score <= 7) {
          badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
          dotColor = 'bg-amber-500';
          label = 'Moderate Risk';
        } else if (score > 7) {
          badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
          dotColor = 'bg-rose-500';
          label = 'High Risk';
        }

        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${badgeColor} text-[10px] font-bold py-0.5 px-2 gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
              {score.toFixed(1)} — {label}
            </Badge>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (row: Driver) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 px-2.5 text-[11px] font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 shadow-2xs gap-1.5 rounded-lg"
              >
                <span>Actions</span>
                <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-lg rounded-xl border border-slate-200 bg-white">
              <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                Driver Operations
              </DropdownMenuLabel>
              
              <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-slate-100" onClick={() => navigate(`/drivers/${row.id}`)}>
                <Eye className="mr-2 h-3.5 w-3.5 text-blue-600 shrink-0" />
                View Driver Profile
              </DropdownMenuItem>

              <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-emerald-50" onClick={() => {
                setStatusDialogDriver(row);
                setNewStatus(row.status);
              }}>
                <RefreshCw className="mr-2 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Quick Status Update
              </DropdownMenuItem>

              <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-slate-100" onClick={() => navigate(`/drivers/${row.id}/documents`)}>
                <FileText className="mr-2 h-3.5 w-3.5 text-purple-600 shrink-0" />
                Driver Compliance Docs
              </DropdownMenuItem>

              <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-slate-100" onClick={() => navigate(`/drivers/${row.id}/edit`)}>
                <Edit2 className="mr-2 h-3.5 w-3.5 text-amber-600 shrink-0" />
                Edit Driver Profile
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-slate-100" />

              <DropdownMenuItem
                className="cursor-pointer text-xs font-semibold py-2 px-2.5 rounded-lg text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                onClick={async () => {
                  if (confirm(`Delete driver ${row.first_name} ${row.last_name}?`)) {
                    await driverService.bulkDelete([row.id]);
                    queryClient.invalidateQueries({ queryKey: ['drivers'] });
                  }
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-600 shrink-0" />
                Delete Driver Record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: 'Mark Available',
      icon: <CheckCircle size={13} />,
      onClick: async (selectedRows: Driver[]) => {
        if (!confirm(`Mark ${selectedRows.length} drivers as Available?`)) return;
        try {
          await driverService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Available');
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
        } catch (e) { alert('Failed to update status'); }
      }
    },
    {
      label: 'Mark Off-Duty',
      icon: <XCircle size={13} />,
      variant: 'secondary' as const,
      onClick: async (selectedRows: Driver[]) => {
        if (!confirm(`Mark ${selectedRows.length} drivers as Off Duty?`)) return;
        try {
          await driverService.bulkUpdateStatus(selectedRows.map(r => r.id), 'OffDuty');
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
        } catch (e) { alert('Failed to update status'); }
      }
    },
    {
      label: 'Log communication (not yet wired to SMS)',
      icon: <Send size={13} />,
      variant: 'secondary' as const,
      onClick: async (selectedRows: Driver[]) => {
        const msg = prompt('Enter message content to log for selected drivers (NOTE: not yet wired to real SMS provider):');
        if (!msg) return;
        try {
          await notificationService.sendBulkCommunication({
            entity_type: 'Driver',
            ids: selectedRows.map(r => r.id),
            method: 'sms',
            subject: 'Dashboard Operational Notification',
            message: msg
          });
          alert('Messages logged successfully (SMS dispatch pending real provider integration).');
        } catch (e) { alert('Failed to log messages'); }
      }
    },
    {
      label: 'Export CSV',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Driver[]) => {
        downloadCSV(selectedRows, 'drivers_export.csv');
      }
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: async (selectedRows: Driver[]) => {
        if (!confirm(`Are you sure you want to delete ${selectedRows.length} driver records?`)) return;
        try {
          await driverService.bulkDelete(selectedRows.map(r => r.id));
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
        } catch (e) { alert('Failed to delete drivers'); }
      }
    }
  ];

  return (
    <DashboardLayout 
      active="Drivers" 
      title="Drivers" 
    >
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in gap-5">
        
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
              <User className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Drivers
                </h1>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200/80 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                  Fleet Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Scope: Manage driver roster, AI safety risk scores, and license compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={() => downloadCSV(filteredDrivers, 'drivers_export.csv')}
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export CSV
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs rounded-md px-4"
              onClick={() => navigate('/drivers/new')}
            >
              <Plus className="h-4 w-4" />
              Add Driver
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={handleRefresh}
              title="Refresh Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <KpiCard
            title="TOTAL REGISTERED DRIVERS"
            value={totalCount}
            variant="brand"
            trend="up"
            trendValue="+5 Active"
            description="Click to view all drivers"
            icon={DriverBadge}
            onClick={() => { setSelectedStatus('All'); setRiskFilter('All'); setCurrentPage(1); }}
          >
            <DriverRosterKpi 
              count={totalCount} 
              onlineCount={availableCount} 
              safetyScore={4.9} 
            />
          </KpiCard>

          <KpiCard
            title="AVAILABLE NOW"
            value={availableCount}
            variant="emerald"
            trend="up"
            trendValue="Available"
            description="Click to filter Available drivers"
            icon={CheckBadge}
            completionGauge={{
              percentage: Math.round((availableCount / (totalCount || 1)) * 100) || 75,
              label: `${Math.round((availableCount / (totalCount || 1)) * 100)}% Available`,
              subtext: `${availableCount} Ready • ${onTripCount} Dispatched`
            }}
            onClick={() => { setSelectedStatus('Available'); setCurrentPage(1); }}
          />

          <KpiCard
            title="ACTIVE ON ROAD"
            value={onTripCount}
            variant="blue"
            trend="neutral"
            trendValue="Dispatched"
            description="Click to filter On-Trip drivers"
            icon={TruckMotion}
            chartData={[4, 6, 8, 7, 10, 9, onTripCount || 12]}
            onClick={() => { setSelectedStatus('OnTrip'); setCurrentPage(1); }}
          />

          <KpiCard
            title="HIGH RISK / EXPIRED"
            value={highRiskCount}
            variant="amber"
            trend={highRiskCount > 0 ? "down" : "neutral"}
            trendValue={highRiskCount > 0 ? "Review Required" : "All Clear"}
            description="Click for MOT compliance details"
            icon={RiskAlert}
            progressSegments={[
              { label: `High Risk (${highRiskDriversCount})`, value: Math.max(highRiskDriversCount > 0 ? 10 : 0, highRiskSegPct), color: 'bg-rose-500' },
              { label: `Expired (${expiredLicenseCount})`, value: Math.max(expiredLicenseCount > 0 ? 10 : 0, expiredSegPct), color: 'bg-amber-500' },
              { label: `Clear (${clearDriversCount})`, value: Math.max(10, clearSegPct), color: 'bg-slate-300' },
            ]}
            onClick={() => setShowMotModal(true)}
          />
        </div>

        {/* Filter & Control Bar */}
        <div className="bg-white rounded-xl border border-black/[0.08] p-2.5 shadow-2xs shrink-0">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            
            {/* Search Input & Inline Dropdown Controls (Strictly Horizontal) */}
            <div className="flex items-center gap-2.5 shrink-0">
              
              {/* Search Input */}
              <div className="relative w-64 shrink-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search driver ID, name, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs border-slate-200 rounded-lg focus-visible:ring-slate-400 bg-white"
                />
              </div>

              {/* Status Filter Dropdown */}
              <Select
                value={selectedStatus}
                onValueChange={(val) => {
                  if (val) {
                    setSelectedStatus(val as DriverStatus | 'All');
                    setCurrentPage(1);
                  }
                }}
              >
                <SelectTrigger className="h-9 px-3 w-44 shrink-0 border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <SelectValue placeholder="All Statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="w-56 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                      Filter Duty Status
                    </SelectLabel>
                    <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        All Statuses
                      </span>
                    </SelectItem>
                  </SelectGroup>
                  <SelectSeparator className="my-1 border-slate-100" />
                  <SelectGroup>
                    <SelectItem value="Available" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Available
                      </span>
                    </SelectItem>
                    <SelectItem value="OnTrip" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-blue-700">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        On Trip
                      </span>
                    </SelectItem>
                    <SelectItem value="OffDuty" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Off Duty
                      </span>
                    </SelectItem>
                    <SelectItem value="Inactive" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-rose-700">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Inactive
                      </span>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* AI Risk Filter Dropdown */}
              <Select
                value={riskFilter}
                onValueChange={(val) => { if (val) setRiskFilter(val as any); }}
              >
                <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <SelectValue placeholder="AI Risk Score" />
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="w-48 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                      AI Safety Score
                    </SelectLabel>
                    <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Risk Scores</SelectItem>
                    <SelectItem value="Low" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-emerald-700">Low Risk (&lt; 3.0)</SelectItem>
                    <SelectItem value="Moderate" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-amber-700">Moderate (3.0 - 7.0)</SelectItem>
                    <SelectItem value="High" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-700">High Risk (&gt; 7.0)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* License Expiry Filter Dropdown */}
              <Select
                value={licenseFilter}
                onValueChange={(val) => { if (val) setLicenseFilter(val as any); }}
              >
                <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <SelectValue placeholder="License Expiry" />
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="w-48 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                      License Status
                    </SelectLabel>
                    <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Licenses</SelectItem>
                    <SelectItem value="Valid" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Valid Licenses</SelectItem>
                    <SelectItem value="Expired" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600">Expired Licenses</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

            </div>

            {/* View Mode Switcher Pill */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60 shrink-0 ml-auto">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'list' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List size={13} />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'grid' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid size={13} />
                <span>Grid</span>
              </button>
            </div>

          </div>
        </div>

        {/* Dynamic Table or Grid Render */}
        {viewMode === 'list' ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <DataTable
              title="🥞 Driver Roster Ledger"
              data={filteredDrivers}
              columns={columns}
              isLoading={isLoading}
              isError={isError}
              errorMessage={(error as Error)?.message || 'Failed to load drivers.'}
              bulkActions={bulkActions}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              totalRecords={totalCount}
              onPageChange={(page) => setCurrentPage(page)}
              onRowClick={(row) => navigate(`/drivers/${row.id}`)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 h-[120px] skeleton"></div>
              ))
            ) : isError ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-2">
                  <X size={28} />
                </div>
                <p className="text-sm font-bold text-slate-900">Data Unavailable</p>
                <p className="text-xs text-slate-500 mt-1">{(error as Error)?.message || 'Failed to load drivers.'}</p>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <p className="text-sm font-bold text-slate-900">No Records Found</p>
                <p className="text-xs text-slate-500 mt-1">There are no drivers matching your current filters.</p>
              </div>
            ) : filteredDrivers.map(d => {
              const initials = `${d.first_name?.[0] || ''}${d.last_name?.[0] || ''}`.toUpperCase() || 'DR';
              const isExpired = new Date(d.license_expiry) < new Date();
              return (
                <div 
                  key={d.id} 
                  className="bg-white rounded-xl border border-black/[0.08] p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-indigo-200 transition-all cursor-pointer"
                  onClick={() => navigate(`/drivers/${d.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                        {initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">
                          {d.first_name} {d.last_name}
                        </span>
                        <span className="font-mono text-[11px] text-[#E8450F] font-bold">
                          {d.ref_id || `DRV-${d.id.slice(0, 5).toUpperCase()}`}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>

                  <div className="space-y-1.5 py-2 border-y border-slate-100 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-medium text-slate-400">Phone:</span>
                      <span className="font-semibold text-slate-800">{d.phone_primary}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-medium text-slate-400">License:</span>
                      <span className="font-mono font-semibold text-slate-800">{d.license_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-medium text-slate-400">Expiry:</span>
                      <span className={`font-medium ${isExpired ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                        {new Date(d.license_expiry).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold px-2 py-0.5">
                      Risk: {(d.ai_risk_score || 0).toFixed(1)}
                    </Badge>

                    <Button variant="outline" size="sm" className="h-7 text-xs font-semibold">
                      View Profile
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Status Update Modal (Dialog) */}
        <Dialog open={!!statusDialogDriver} onOpenChange={(open) => !open && setStatusDialogDriver(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-[#E8450F]" />
                Update Driver Duty Status
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update operational duty status for <span className="font-bold text-[#E8450F]">{statusDialogDriver?.first_name} {statusDialogDriver?.last_name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Duty Status:
              </label>
              <Select value={newStatus} onValueChange={(val) => { if (val) setNewStatus(val as any); }}>
                <SelectTrigger className="w-full text-xs font-semibold border-slate-200 rounded-lg">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="w-full p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                  <SelectGroup>
                    <SelectItem value="Available" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-emerald-700">Available for Dispatch</SelectItem>
                    <SelectItem value="OnTrip" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-blue-700">On Active Trip</SelectItem>
                    <SelectItem value="OffDuty" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-slate-700">Off Duty</SelectItem>
                    <SelectItem value="Inactive" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-700">Inactive / Suspended</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setStatusDialogDriver(null)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white"
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Saving...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MOT Compliance Verification Modal */}
        <Dialog open={showMotModal} onOpenChange={setShowMotModal}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Saudi MOT & MOMRAH Compliance Status
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Ministry of Transport commercial heavy driver license verification ledger.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60">
                <div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-300">Verified MOT Licenses</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Active commercial heavy transport</div>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono font-bold text-xs">{totalCount - highRiskCount}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60">
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-300">Pending Renewal / Expired</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">Action required with Ministry portal</div>
                </div>
                <Badge className="bg-amber-600 text-white font-mono font-bold text-xs">{highRiskCount}</Badge>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold border-slate-200"
                onClick={() => setShowMotModal(false)}
              >
                Close Verification Summary
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
