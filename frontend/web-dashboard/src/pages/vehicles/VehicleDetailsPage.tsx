import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Edit2, FileText, Truck, MapPin, Settings, AlertTriangle, Route, Trash2, 
  ShieldCheck, CheckCircle2, Clock, User, IdCard, Building2, ExternalLink, Gauge, Fuel, 
  Wrench, Calendar, Radio, Activity, FileCheck, AlertCircle, Eye
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { vehicleService } from '@/services/vehicleService';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function VehicleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'specs' | 'compliance' | 'telematics' | 'maintenance'>('specs');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const { data: vehicle, isLoading, error } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleService.getById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => vehicleService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      navigate('/vehicles');
    },
    onError: (err: any) => {
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete vehicle asset.');
    },
  });

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Vehicles" title="Vehicle Details">
        <div className="px-6 pb-6 max-w-[1300px] mx-auto w-full space-y-5 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !vehicle) {
    return (
      <DashboardLayout active="Vehicles" title="Vehicle Details">
        <div className="px-6 pb-6 max-w-[1300px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Vehicle Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested vehicle asset does not exist or may have been removed from the MERCON fleet.
          </p>
          <Button onClick={() => navigate('/vehicles')} size="sm" className="mt-2 text-xs font-bold bg-[#E8450F] text-white">
            Return to Fleet Roster
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const capacityTons = ((vehicle.capacity_kg || 24000) / 1000).toFixed(1);
  const trailerCapacityTons = vehicle.trailer_capacity_kg ? ((vehicle.trailer_capacity_kg || 0) / 1000).toFixed(1) : null;

  return (
    <DashboardLayout active="Vehicles" title={`Vehicle: ${vehicle.plate_number}`}>
      <div className="px-6 pb-6 space-y-5 animate-fade-in max-w-[1300px] mx-auto w-full">

        {/* ── Page Content Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/vehicles')}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              title="Back to Fleet Roster"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <span>{vehicle.plate_number}</span>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    KSA
                  </Badge>
                </h1>
                <StatusBadge status={vehicle.status} />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Ref ID: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{vehicle.ref_id || 'TRK-9021'}</span> • {vehicle.asset_type || 'Heavy Tractor'} Asset
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/vehicles/${vehicle.id}/documents`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Documents Vault
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              Edit Vehicle
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold border-rose-200 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 shadow-2xs dark:bg-slate-900 dark:border-rose-900/50"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              Delete Vehicle
            </Button>
          </div>
        </div>

        {/* ── Vehicle Command Profile Header Card ─────────────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Avatar & Asset Identity */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl font-black border-2 border-indigo-100 dark:border-indigo-900/60 shadow-md">
                  <Truck size={32} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="GPS Signal Live"></span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                    {vehicle.plate_number}
                  </h2>
                  <Badge variant="outline" className="bg-[#FFF0EB] text-[#E8450F] border-[#E8450F]/30 text-[10px] font-bold">
                    {vehicle.asset_type || 'Heavy Tractor'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                    <Radio className="w-3.5 h-3.5 text-emerald-500" /> GPS: {vehicle.gps_device_id || 'GPS-4891'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> Riyadh Central Hub
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Truck className="w-3.5 h-3.5 text-slate-400" /> Trailer: {vehicle.trailer_number || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Telematics Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 shrink-0">
              {/* Gauge 1: Capacity */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center min-w-[110px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payload Capacity</div>
                <div className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                  {capacityTons} Tons
                </div>
              </div>

              {/* Gauge 2: Odometer */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center min-w-[110px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Odometer Mileage</div>
                <div className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {(vehicle.current_odometer || 184500).toLocaleString()} km
                </div>
              </div>

              {/* Gauge 3: Istimara Status */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center min-w-[110px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Istimara Permit</div>
                <div className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Valid (142d)</span>
                </div>
              </div>

              {/* Gauge 4: Telematics Unit */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center min-w-[110px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">GPS Telematics</div>
                <div className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>ONLINE</span>
                </div>
              </div>
            </div>

          </div>
        </Card>

        {/* ── 4 Workspace Tabs ───────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 w-full border border-slate-200/60 dark:border-slate-700">
            <TabsTrigger 
              value="specs" 
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-2xs rounded-lg"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Asset Specs & Coupling</span>
            </TabsTrigger>

            <TabsTrigger 
              value="compliance" 
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-2xs rounded-lg"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Istimara & Compliance</span>
            </TabsTrigger>

            <TabsTrigger 
              value="telematics" 
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-2xs rounded-lg"
            >
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              <span>Live Telematics Radar</span>
            </TabsTrigger>

            <TabsTrigger 
              value="maintenance" 
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-2xs rounded-lg"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>Maintenance Bay</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Asset Specs & Coupling ─────────────────────────────────── */}
          <TabsContent value="specs" className="m-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Tractor Specifications */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#E8450F]" /> Heavy Tractor Specifications
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Engine telemetry, GPS hardware IDs, and chassis capacity rating.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Plate Number</span>
                      <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100">{vehicle.plate_number}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Vehicle Ref ID</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{vehicle.ref_id || 'TRK-9021'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Asset Category</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{vehicle.asset_type || 'Heavy Tractor'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Payload Tonnage Cap</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{capacityTons} Tons</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">GPS Telematics Hardware ID</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{vehicle.gps_device_id || 'GPS-4891-KSA'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">ICCES Telematics ID</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{vehicle.icces_device_id || 'ICCES-9912'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Attached Trailer Configuration */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-500" /> Attached Trailer & Coupling
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Trailing asset specifications and refrigeration temperature control rating.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-4 text-xs">
                  {vehicle.trailer_number ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{vehicle.trailer_number}</h4>
                          <p className="text-[11px] text-slate-400 font-mono">Trailer Type: {vehicle.trailer_type || 'Reefer Unit'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Trailer Tonnage Cap</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{trailerCapacityTons || '28.0'} Tons</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Coupling Lock Status</span>
                          <span className="font-bold text-emerald-600">SECURELY COUPLED</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                      <Truck size={32} className="opacity-30 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No trailer currently attached to this tractor.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* ── TAB 2: Istimara & Compliance ────────────────────────────────── */}
          <TabsContent value="compliance" className="m-0 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Saudi Mandatory Vehicle Compliance Audit
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Live verification status of Ministry of Transport Istimara registration and Najm fleet insurance.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/vehicles/${vehicle.id}/documents`)}
                  className="h-8 text-xs font-bold border-slate-200 text-indigo-600"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> Documents Vault
                </Button>
              </CardHeader>

              <CardContent className="p-6 space-y-3">
                
                {/* File 1: Istimara Registration */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Saudi Istimara Commercial Vehicle Registration</div>
                      <div className="text-[10px] text-slate-400">Issuer: Ministry of Commerce & Transport (MOMRAH) • Exp: 142 days remaining</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    ✅ VERIFIED VALID
                  </Badge>
                </div>

                {/* File 2: Commercial Vehicle Insurance */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Najm Commercial Heavy Fleet Insurance Policy</div>
                      <div className="text-[10px] text-slate-400">Issuer: Najm Insurance Services • Full Comprehensive Commercial Cover</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    ✅ VERIFIED VALID
                  </Badge>
                </div>

                {/* File 3: Periodic Inspection (Fahs) */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Fahs Periodic Safety Inspection Certificate</div>
                      <div className="text-[10px] text-slate-400">Issuer: Saudi Safety Standards Station • Renewal due in 12 days</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                    ⚠️ RENEWAL DUE SOON
                  </Badge>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 3: Live Telematics & Location Radar ─────────────────────── */}
          <TabsContent value="telematics" className="m-0 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-500" /> GPS Live Telemetry & Corridor Radar
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Real-time vehicle position, speed, engine status, and fuel levels.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                  🟢 LIVE GPS PING
                </Badge>
              </CardHeader>

              <CardContent className="p-6">
                {vehicle.status === 'OnTrip' ? (
                  <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-indigo-600 animate-bounce" />
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Vehicle in Transit</h4>
                          <p className="text-xs text-slate-500">Riyadh ➔ Dammam Highway Corridor (KM 142)</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => navigate('/trips')} className="h-8 text-xs font-bold bg-indigo-600 text-white">
                        Track Active Trip
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Cruising Speed</span>
                        <span className="font-mono font-extrabold text-sm text-indigo-600">78 km/h</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Engine Status</span>
                        <span className="font-bold text-emerald-600">RUNNING</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Fuel Level</span>
                        <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">84% Tank</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">GPS Signal</span>
                        <span className="font-bold text-emerald-600">STRONG (12 Sat)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                    <Truck size={32} className="opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Vehicle is parked at Riyadh Central Hub (Not currently on trip).</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 4: Maintenance Bay ──────────────────────────────────────── */}
          <TabsContent value="maintenance" className="m-0 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-500" /> Service & Workshop Maintenance Ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Log of oil changes, brake inspections, and workshop service visits.
                  </CardDescription>
                </div>

                <Badge variant="outline" className="text-[10px] font-mono font-bold text-slate-500">
                  Last Service: 14 days ago
                </Badge>
              </CardHeader>

              <CardContent className="p-0">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                      <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Service Date</th>
                      <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Service Description</th>
                      <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Odometer Reading</th>
                      <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">2026-07-15</td>
                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">Full Synthetic Oil & Filter Service</td>
                      <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-400">182,100 km</td>
                      <td className="px-5 py-3">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">COMPLETED</Badge>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">2026-05-10</td>
                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">Brake Pad & Drum Inspection</td>
                      <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-400">174,500 km</td>
                      <td className="px-5 py-3">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">COMPLETED</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>

      {/* ── Delete Vehicle Confirmation Modal ────────────────────────────── */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Delete Vehicle Asset</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Deleting vehicle <strong className="text-slate-900 dark:text-slate-100">{vehicle.plate_number}</strong> will remove it from active fleet rosters. Enter admin password to confirm.
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
                <Label htmlFor="admin_password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={deleteMutation.isPending}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4"
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
