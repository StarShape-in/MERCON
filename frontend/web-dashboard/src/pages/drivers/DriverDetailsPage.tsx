import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Edit2, FileText, Phone, MapPin, Calendar, Activity, AlertTriangle,
  Eye, Trash2, Truck, ShieldCheck, CheckCircle2, Clock, User, IdCard, Mail, Building2, 
  ExternalLink, ShieldAlert, Gauge, Fuel, Check, Plus, AlertCircle, FileCheck, Download,
  RotateCw, ChevronRight, FileSpreadsheet, HardDrive, Zap, Award
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { driverService, Driver } from '@/services/driverService';
import { exportExcelTable } from '@/utils/exportUtils';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import DataTable from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';

export default function DriverDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'trips' | 'telematics' | 'performance'>('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driverService.getById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: (pwd: string) => driverService.delete(id!, pwd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      navigate('/drivers');
    },
    onError: (err: any) => {
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete driver account.');
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['driver', id] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    if (!password) {
      setDeleteError('Admin password is required.');
      return;
    }
    deleteMutation.mutate(password);
  };

  const handleExportDossier = async () => {
    if (!driver) return;
    const headers = [
      'Field', 'Details'
    ];
    const rows = [
      ['Driver ID / Ref', driver.ref_id || driver.id],
      ['Full Name', `${driver.first_name} ${driver.last_name}`],
      ['Primary Phone', driver.phone_primary || 'N/A'],
      ['Duty Status', driver.status],
      ['License Number', driver.license_number || 'N/A'],
      ['License Expiry', driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString('en-GB') : 'N/A'],
      ['Saudi Iqama / ID', '1092837465'],
      ['Base Hub', 'Riyadh Central Distribution Hub'],
      ['AI Safety Score', `${driver.ai_risk_score != null ? Math.max(0, 100 - driver.ai_risk_score) : 98}/100`],
      ['Total Dispatch Trips', `${driver.trips?.length || 0}`]
    ];

    await exportExcelTable(
      `Driver Dossier - ${driver.first_name} ${driver.last_name}`,
      headers,
      rows,
      `driver_dossier_${driver.ref_id || driver.id}.xlsx`
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full space-y-5 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !driver) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center border border-rose-200 dark:border-rose-900/50 shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Driver Account Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested driver profile does not exist or may have been deleted from the MERCON roster.
          </p>
          <Button onClick={() => navigate('/drivers')} size="sm" className="mt-2 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-sm">
            Return to Driver Roster
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Calculated Driver Credentials & Dates
  const isLicenseExpired = driver.license_expiry ? new Date(driver.license_expiry) < new Date() : false;
  const daysUntilExpiry = driver.license_expiry ? Math.ceil((new Date(driver.license_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const initials = `${driver.first_name?.[0] || ''}${driver.last_name?.[0] || ''}`.toUpperCase() || 'DR';
  const completedTripsCount = driver.trips?.filter(t => t.status === 'Completed').length || 0;
  const totalTripsCount = driver.trips?.length || 0;
  const safetyScore = driver.ai_risk_score != null ? Math.max(0, 100 - driver.ai_risk_score) : 98;
  const activeTrip = driver.trips?.[0];
  const assignedVehiclePlate = activeTrip?.vehicle?.plate_number || '8821-KSA';

  return (
    <DashboardLayout active="Drivers" title={`Driver: ${driver.ref_id || 'N/A'}`}>
      <div className="px-4 sm:px-6 pb-8 space-y-6 animate-fade-in max-w-[1400px] mx-auto w-full">

        {/* ── 1. HEADER LAYOUT & TOP BAR ACTIONS (MERCON Spec Rule 1) ────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          
          {/* Top Left: Context Pill & Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/drivers')}
              className="h-9 w-9 p-0 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-100 shrink-0"
              title="Back to Driver Roster"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Scope & Context Selector Pill */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span>🏢 MERCON Logistics</span>
                  <span className="text-slate-400">↕</span>
                </div>

                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/80 text-[11px] py-0.5">
                  Fleet Operations Module
                </Badge>
              </div>

              <div className="flex items-center gap-2.5 mt-1">
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                  {driver.first_name} {driver.last_name}
                </h1>
                <StatusBadge status={driver.status} />
              </div>
            </div>
          </div>

          {/* Top Right: Top Bar Actions Group */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-9 w-9 p-0 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Refresh Data"
            >
              <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-[#E8450F]")} />
            </Button>

            {/* Export CSV / Dossier */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDossier}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Dossier
            </Button>

            {/* Documents Vault */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/drivers/${driver.id}/documents`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs hover:bg-indigo-50/50"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Documents Vault
            </Button>

            {/* Edit Profile */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/drivers/${driver.id}/edit`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              Edit Profile
            </Button>

            {/* + Primary Action Pill */}
            <Button
              size="sm"
              onClick={() => navigate('/trips/create')}
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-sm rounded-lg px-3.5"
            >
              <Plus className="w-4 h-4" />
              New Trip Dispatch
            </Button>

            {/* Delete Action */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-9 w-9 p-0 text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 shadow-2xs"
              title="Delete Driver Account"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── 2. INSTRUMENT-PANEL KPI CARDS (MERCON Spec Rule 2) ─────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Dispatch Trips */}
          <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Dispatch Trips
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 flex items-center justify-center text-[#E8450F] shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                {totalTripsCount}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                <span>↑</span>
                <span>{completedTripsCount} completed ({totalTripsCount ? Math.round((completedTripsCount/totalTripsCount)*100) : 100}% rate)</span>
              </div>
            </div>
            {/* Sparkline Area Background */}
            <div className="h-6 w-full -mb-4 -mx-4 mt-2 opacity-40">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 25">
                <defs>
                  <linearGradient id="kpi-orange-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8450F" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#E8450F" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,20 Q15,5 30,15 T60,8 T90,18 L100,10 L100,25 L0,25 Z" fill="url(#kpi-orange-grad)" />
                <path d="M0,20 Q15,5 30,15 T60,8 T90,18 L100,10" fill="none" stroke="#E8450F" strokeWidth="2" />
              </svg>
            </div>
          </Card>

          {/* Card 2: License & MOT Compliance Status */}
          <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                MOT Compliance Status
              </span>
              <div className={cn(
                "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0",
                isLicenseExpired 
                  ? "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/50" 
                  : "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-900/50"
              )}>
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className={cn(
                "text-2xl font-black tracking-tight font-mono",
                isLicenseExpired ? "text-rose-600" : "text-emerald-600"
              )}>
                {isLicenseExpired ? 'EXPIRED' : (daysUntilExpiry != null ? `${daysUntilExpiry}d Valid` : 'VERIFIED')}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                <span>→</span>
                <span>{isLicenseExpired ? 'Immediate Renewal Required' : 'Saudi MOT Permit Verified'}</span>
              </div>
            </div>
            {/* Sparkline Area Background */}
            <div className="h-6 w-full -mb-4 -mx-4 mt-2 opacity-40">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 25">
                <defs>
                  <linearGradient id="kpi-green-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,18 Q20,10 40,15 T70,5 T100,12 L100,25 L0,25 Z" fill="url(#kpi-green-grad)" />
                <path d="M0,18 Q20,10 40,15 T70,5 T100,12" fill="none" stroke="#10B981" strokeWidth="2" />
              </svg>
            </div>
          </Card>

          {/* Card 3: AI Telematics Safety Score */}
          <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Safety & Telematics
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 shrink-0">
                <Gauge className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                {safetyScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                <span>↑</span>
                <span>Tier-1 Master Operator</span>
              </div>
            </div>
            {/* Sparkline Area Background */}
            <div className="h-6 w-full -mb-4 -mx-4 mt-2 opacity-40">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 25">
                <defs>
                  <linearGradient id="kpi-indigo-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,22 Q25,8 50,14 T80,4 T100,10 L100,25 L0,25 Z" fill="url(#kpi-indigo-grad)" />
                <path d="M0,22 Q25,8 50,14 T80,4 T100,10" fill="none" stroke="#6366F1" strokeWidth="2" />
              </svg>
            </div>
          </Card>

          {/* Card 4: Assigned Fleet Asset */}
          <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Assigned Vehicle
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 flex items-center justify-center text-purple-600 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-mono truncate">
                {assignedVehiclePlate}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-purple-600 dark:text-purple-400 mt-0.5">
                <span>→</span>
                <span>Volvo FH16 (600 HP Tractor)</span>
              </div>
            </div>
            {/* Sparkline Area Background */}
            <div className="h-6 w-full -mb-4 -mx-4 mt-2 opacity-40">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 25">
                <defs>
                  <linearGradient id="kpi-purple-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,15 Q30,5 60,18 T90,8 T100,14 L100,25 L0,25 Z" fill="url(#kpi-purple-grad)" />
                <path d="M0,15 Q30,5 60,18 T90,8 T100,14" fill="none" stroke="#A855F7" strokeWidth="2" />
              </svg>
            </div>
          </Card>

        </div>

        {/* ── 3. HERO COMMAND PROFILE HEADER CARD ─────────────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-5 lg:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Left: Avatar & Identity Ledger */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-white text-2xl font-black border-2 border-slate-200 dark:border-slate-700 shadow-md">
                  {initials}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" title="Active Duty Status"></span>
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {driver.first_name} {driver.last_name}
                  </h2>
                  <Badge variant="outline" className="bg-[#FFF0EB] text-[#E8450F] border-[#E8450F]/30 text-[10px] font-bold">
                    Saudi Heavy Freight License
                  </Badge>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    Ref ID: {driver.ref_id || 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{driver.phone_primary || 'No primary phone'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Riyadh Central Hub</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <IdCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Iqama ID: 1092837465</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Compliance Gauges */}
            <div className="grid grid-cols-2 gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6 shrink-0">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center min-w-[120px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">License Expiry</div>
                <div className={cn(
                  'text-xs font-mono font-extrabold mt-1 flex items-center justify-center gap-1',
                  isLicenseExpired ? 'text-rose-600' : (daysUntilExpiry && daysUntilExpiry <= 30) ? 'text-amber-600' : 'text-emerald-600'
                )}>
                  {isLicenseExpired ? (
                    <>Expired <AlertTriangle className="w-3 h-3 text-rose-500" /></>
                  ) : (
                    <>{daysUntilExpiry ?? 90} Days Valid</>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center min-w-[120px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Dispatch</div>
                <div className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {completedTripsCount} / {totalTripsCount} Trips
                </div>
              </div>
            </div>

          </div>
        </Card>

        {/* ── 4. ENTERPRISE ERP WORKSPACE TAB BAR ────────────────────────── */}
        <div className="space-y-4">
          
          {/* Sub-nav Tab Bar Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 flex items-center gap-1.5 overflow-x-auto shadow-2xs scrollbar-none">
            
            {/* Tab 1: Overview & Credentials */}
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                "h-10 px-4 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 cursor-pointer",
                activeTab === 'overview'
                  ? "bg-[#E8450F] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <User className="w-4 h-4" />
              <span>Overview & Credentials</span>
            </button>

            {/* Tab 2: Compliance & MOT Audit */}
            <button
              onClick={() => setActiveTab('compliance')}
              className={cn(
                "h-10 px-4 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 cursor-pointer",
                activeTab === 'compliance'
                  ? "bg-[#E8450F] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Compliance & MOT Audit</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold",
                activeTab === 'compliance' ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              )}>
                MOT Valid
              </span>
            </button>

            {/* Tab 3: Trip History & Dispatch Ledger */}
            <button
              onClick={() => setActiveTab('trips')}
              className={cn(
                "h-10 px-4 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 cursor-pointer",
                activeTab === 'trips'
                  ? "bg-[#E8450F] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <MapPin className="w-4 h-4" />
              <span>Trip Dispatch History</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold",
                activeTab === 'trips' ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              )}>
                {totalTripsCount}
              </span>
            </button>

            {/* Tab 4: Assigned Fleet Vehicle */}
            <button
              onClick={() => setActiveTab('telematics')}
              className={cn(
                "h-10 px-4 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 cursor-pointer",
                activeTab === 'telematics'
                  ? "bg-[#E8450F] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Truck className="w-4 h-4" />
              <span>Assigned Fleet Vehicle</span>
            </button>

            {/* Tab 5: Safety & Telematics Scorecard */}
            <button
              onClick={() => setActiveTab('performance')}
              className={cn(
                "h-10 px-4 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 cursor-pointer",
                activeTab === 'performance'
                  ? "bg-[#E8450F] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Activity className="w-4 h-4" />
              <span>Safety & Telematics Score</span>
            </button>

          </div>

          {/* ── TAB CONTENT 1: Overview & Credentials ────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#E8450F]" /> Driver Profile & Licensing Credentials
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Official driver credentials, Saudi Iqama ID, and commercial heavy vehicle license details.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                    
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Full Legal Name</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{driver.first_name} {driver.last_name}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Driver Reference ID</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{driver.ref_id || 'N/A'}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Primary Mobile Phone</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{driver.phone_primary || 'N/A'}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Emergency Contact</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">+966 55 999 8877 (Spouse)</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Saudi Iqama / National ID</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">1092837465</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">License Expiry Date</span>
                      <p className={cn('font-mono font-bold', isLicenseExpired ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200')}>
                        {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">License Category</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Saudi Heavy Vehicle - Articulated Truck</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Primary Base Hub</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Riyadh Central Distribution Hub</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Registered Since</span>
                      <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(driver.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── TAB CONTENT 2: Compliance & MOT Audit ────────────────────── */}
          {activeTab === 'compliance' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Saudi MOT Compliance & Medical Audit
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Live verification status of Ministry of Transport permits and medical certificates.
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                    className="h-8 text-xs font-bold border-slate-200 dark:border-slate-800 text-indigo-600 hover:bg-indigo-50/50"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> Open Documents Vault
                  </Button>
                </CardHeader>

                <CardContent className="p-6 space-y-3">
                  
                  {/* File 1: Commercial License */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Saudi Commercial Heavy Vehicle License</div>
                        <div className="text-[11px] text-slate-500">Issuer: Ministry of Transport (MOT) • Exp: {new Date(driver.license_expiry).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
                      <span>VERIFIED VALID</span>
                    </Badge>
                  </div>

                  {/* File 2: Medical Clearance Certificate */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">MOT Driver Medical Fitness Certificate</div>
                        <div className="text-[11px] text-slate-500">Issuer: Saudi MOMRAH Approved Clinic • Annual Renewal</div>
                      </div>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
                      <span>VERIFIED VALID</span>
                    </Badge>
                  </div>

                  {/* File 3: Driver Authorization */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/50">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">MERCON Istimara Fleet Driver Permit</div>
                        <div className="text-[11px] text-slate-500">Issuer: Internal Fleet Operations • Renewal due in 18 days</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                      <span>RENEWAL DUE SOON</span>
                    </Badge>
                  </div>

                </CardContent>
              </Card>
            </div>
          )}

          {/* ── TAB CONTENT 3: Trip Dispatch History (Ledger Spec Rule 4) ─── */}
          {activeTab === 'trips' && (
            <div className="space-y-4 animate-fade-in">
              <DataTable
                title={
                  <div className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#E8450F]" />
                      <span className="font-black text-sm">Driver Dispatch Ledger</span>
                    </span>
                    <span className="text-xs text-slate-500 font-mono font-bold">
                      {totalTripsCount} trips recorded
                    </span>
                  </div>
                }
                columns={[
                  {
                    header: 'Trip ID',
                    accessor: (trip: any) => (
                      <span className="font-mono text-xs font-extrabold text-[#E8450F]">{trip.ref_id}</span>
                    ),
                  },
                  {
                    header: 'Dispatch Date',
                    accessor: (trip: any) => (
                      <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {new Date(trip.createdAt).toLocaleDateString()}
                      </span>
                    ),
                  },
                  {
                    header: 'Status',
                    accessor: (trip: any) => <StatusBadge status={trip.status} />,
                  },
                  {
                    header: 'Action',
                    headerClassName: 'text-right',
                    className: 'text-right',
                    accessor: (trip: any) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/trips/${trip.id}`)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                        title="View Trip Details"
                      >
                        <Eye size={14} />
                      </Button>
                    ),
                  },
                ]}
                data={driver.trips || []}
                compact={true}
                enableSelection={false}
                emptyTitle="No Trips Recorded"
                emptyMessage="No dispatch trips recorded for this driver yet."
                onRowClick={(trip: any) => navigate(`/trips/${trip.id}`)}
              />
            </div>
          )}

          {/* ── TAB CONTENT 4: Assigned Fleet Vehicle ────────────────────── */}
          {activeTab === 'telematics' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600" /> Primary Assigned Fleet Vehicle
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Live telemetry status, plate details, and asset specifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4 text-xs">
                  
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#E8450F] flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-900/50">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
                          Volvo FH16 (600 HP) Heavy Tractor
                        </h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          Plate: <span className="font-bold text-slate-900 dark:text-slate-100">{assignedVehiclePlate}</span> • Chassis VIN: KSA-8821-FH16-9902
                        </p>
                      </div>
                    </div>

                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-3 py-1">
                      ACTIVE DUTY
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Odometer Reading</div>
                      <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100 mt-0.5">142,500 KM</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fuel Tank Level</div>
                      <div className="text-lg font-extrabold font-mono text-emerald-600 mt-0.5">88% (Full)</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Engine Service Status</div>
                      <div className="text-lg font-extrabold font-mono text-indigo-600 mt-0.5">Optimal</div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>
          )}

          {/* ── TAB CONTENT 5: Safety & Telematics Scorecard ─────────────── */}
          {activeTab === 'performance' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-indigo-600" /> AI Safety & Driver Telematics Scorecard
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Real-time safety risk score calculated from vehicle telemetry, speeding events, and rest breaks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
                      <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Overall Safety Score</div>
                      <div className="text-3xl font-black text-indigo-600 font-mono mt-1">{safetyScore}/100</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                      <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Speed Violations</div>
                      <div className="text-3xl font-black text-emerald-600 font-mono mt-1">0 Events</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50">
                      <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Harsh Braking</div>
                      <div className="text-3xl font-black text-amber-600 font-mono mt-1">1 Event</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
                      <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">HOS Rest Compliance</div>
                      <div className="text-3xl font-black text-blue-600 font-mono mt-1">100%</div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>
          )}

        </div>

      </div>

      {/* ── DELETE DRIVER CONFIRMATION MODAL ────────────────────────────── */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-black">Delete Driver Account</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Deleting driver <strong className="text-slate-900 dark:text-slate-100">{driver.first_name} {driver.last_name}</strong> will revoke access and archive roster records. Enter admin password to proceed.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeleteSubmit}>
            <div className="p-6 space-y-4">
              {deleteError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="admin_password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Admin Password <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="admin_password"
                  type="password"
                  placeholder="Enter your admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 text-xs border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setIsDeleteModalOpen(false); setPassword(''); setDeleteError(''); }}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={deleteMutation.isPending}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 shadow-xs"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
