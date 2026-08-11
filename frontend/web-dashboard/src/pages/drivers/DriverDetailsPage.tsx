import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, Phone, MapPin, AlertTriangle,
  Eye, Trash2, Truck, ShieldCheck, User, IdCard,
  Plus, AlertCircle, FileCheck, Download,
  RotateCw, Calendar
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import KpiCard from '@/components/ui/KpiCard';
import { driverService } from '@/services/driverService';
import { documentService } from '@/services/documentService';
import { exportExcelTable } from '@/utils/exportUtils';
import CreateTripModal from '@/components/trips/CreateTripModal';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import DataTable from '@/components/ui/DataTable';
import { getUpcomingScheduledDates } from '@/utils/scheduleUtils';
import { cn } from '@/lib/utils';

export default function DriverDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driverService.getById(id!),
    enabled: !!id,
  });

  const { data: docsRes, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['documents', 'Driver', id],
    queryFn: () => documentService.getAll({ entity_type: 'Driver', entity_id: id, per_page: 50 }),
    enabled: !!id,
  });
  const documents = docsRes?.data || [];

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
    await queryClient.invalidateQueries({ queryKey: ['documents', 'Driver', id] });
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
      ['Driver Ref ID', driver.ref_id || driver.id],
      ['Full Name', `${driver.first_name} ${driver.last_name}`],
      ['Primary Phone', driver.phone_primary || 'N/A'],
      ['Duty Status', driver.status],
      ['License Number', driver.license_number || 'N/A'],
      ['License Expiry', driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString('en-GB') : 'N/A'],
      ['Assigned Vehicle', driver.assignedVehicle?.plate_number || 'Unassigned'],
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
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full space-y-4 animate-pulse">
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
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

  const isLicenseExpired = driver.license_expiry ? new Date(driver.license_expiry) < new Date() : false;
  const daysUntilExpiry = driver.license_expiry ? Math.ceil((new Date(driver.license_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const initials = `${driver.first_name?.[0] || ''}${driver.last_name?.[0] || ''}`.toUpperCase() || 'DR';
  const completedTripsCount = driver.trips?.filter(t => t.status === 'Completed').length || 0;
  const totalTripsCount = driver.trips?.length || 0;
  const assignedVehicle = driver.assignedVehicle;

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold">VERIFIED</Badge>;
      case 'Rejected':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 text-[10px] font-bold">REJECTED</Badge>;
      case 'Expired':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 text-[10px] font-bold">EXPIRED</Badge>;
      default:
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold">PENDING</Badge>;
    }
  };

  return (
    <DashboardLayout active="Drivers" title={`Driver: ${driver.ref_id || 'N/A'}`}>
      <div className="px-4 sm:px-6 pb-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto w-full">

        {/* ── COMPACT IDENTITY HEADER ───────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

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

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-white text-base font-black border-2 border-slate-200 dark:border-slate-700 shadow-md shrink-0">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                    {driver.first_name} {driver.last_name}
                  </h1>
                  <StatusBadge status={driver.status} />
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {driver.ref_id || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    {driver.phone_primary || 'No phone'}
                  </span>
                  {driver.license_number && (
                    <span className="flex items-center gap-1 font-mono">
                      <IdCard className="w-3 h-3 text-slate-400 shrink-0" />
                      {driver.license_number}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="h-9 w-9 p-0 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Refresh Data"
              >
                <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-[#E8450F]")} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDossier}
                className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Export
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs hover:bg-indigo-50/50"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Documents
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/drivers/${driver.id}/edit`)}
                className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                Edit
              </Button>

              <Button
                size="sm"
                onClick={() => setIsCreateTripOpen(true)}
                className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-sm rounded-lg px-3.5"
              >
                <Plus className="w-4 h-4" />
                New Trip
              </Button>

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
        </Card>

        {/* ── KPI ROW ───────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Duty Status"
            value={driver.status}
            icon={User}
            variant={driver.status === 'Available' ? 'emerald' : driver.status === 'OnTrip' ? 'blue' : 'amber'}
            subtitle={driver.status === 'Available' ? 'Ready for dispatch' : driver.status === 'OnTrip' ? 'Active on trip' : 'Off-duty / Inactive'}
          />
          <KpiCard
            title="License Expiry"
            value={isLicenseExpired ? 'Expired' : daysUntilExpiry != null ? `${daysUntilExpiry}d` : 'N/A'}
            icon={Calendar}
            variant={isLicenseExpired ? 'rose' : (daysUntilExpiry != null && daysUntilExpiry <= 30) ? 'amber' : 'emerald'}
            subtitle={driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : 'No expiry on file'}
          />
          <KpiCard
            title="Dispatch Trips"
            value={`${completedTripsCount}/${totalTripsCount}`}
            icon={MapPin}
            variant="brand"
            subtitle="Completed / Total"
          />
          <KpiCard
            title="Assigned Vehicle"
            value={assignedVehicle?.plate_number || 'Unassigned'}
            icon={Truck}
            variant="blue"
            subtitle={assignedVehicle?.asset_type || 'No vehicle on file'}
          />
        </div>

        {/* ── MAIN 2-COLUMN CONTENT (no tabs) ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Scheduled Trip Days Section */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Scheduled Trip Days & Availability
                </CardTitle>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold text-xs">
                  {getUpcomingScheduledDates(driver.trips).length} Scheduled Days
                </Badge>
              </CardHeader>
              <CardContent className="p-4">
                {getUpcomingScheduledDates(driver.trips).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Scheduled Trips</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">This driver has no active or upcoming trips assigned.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {getUpcomingScheduledDates(driver.trips).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900/40 hover:border-indigo-300 transition-all cursor-pointer"
                        onClick={() => item.tripRef && navigate(`/trips/${item.tripRef}`)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                              {item.formattedDate}
                            </span>
                            <span className="text-[10px] font-mono text-indigo-600 font-bold truncate">
                              {item.tripRef ? `Trip ${item.tripRef}` : 'Assigned Trip'}
                            </span>
                          </div>
                        </div>
                        {item.status && <StatusBadge status={item.status as any} />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#E8450F]" />
                  <span className="font-black text-sm">Trip Dispatch History</span>
                </span>
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

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Compliance Documents
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                  className="h-8 text-xs font-bold border-slate-200 dark:border-slate-800 text-indigo-600 hover:bg-indigo-50/50"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> Vault
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-2">
                {isLoadingDocs ? (
                  <div className="text-center text-xs text-slate-500 py-6">Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div className="flex items-center justify-between py-4 px-1">
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <FileCheck className="w-4 h-4 text-slate-300" /> No documents uploaded yet.
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                      className="h-7 text-[11px] font-bold"
                    >
                      Upload
                    </Button>
                  </div>
                ) : (
                  documents.map((doc) => {
                    const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                    return (
                      <div key={doc.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{doc.doc_type}</div>
                            <div className="text-[10px] text-slate-500">
                              {doc.expiry_date
                                ? `Exp: ${new Date(doc.expiry_date).toLocaleDateString()}`
                                : `Uploaded: ${new Date(doc.createdAt).toLocaleDateString()}`}
                            </div>
                          </div>
                        </div>
                        {getDocStatusBadge(isExpired ? 'Expired' : doc.status)}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right Column */}
          <div className="space-y-5">

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#E8450F]" /> Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Duty Status</span>
                  <StatusBadge status={driver.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">License Expiry</span>
                  <span className={cn('font-mono font-bold', isLicenseExpired ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200')}>
                    {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Registered Since</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {new Date(driver.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" /> Assigned Vehicle
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs">
                {!assignedVehicle ? (
                  <div className="flex items-center gap-2 text-slate-500 py-2">
                    <Truck className="w-4 h-4 text-slate-300" /> No vehicle currently assigned.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Plate</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{assignedVehicle.plate_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Status</span>
                      <StatusBadge status={assignedVehicle.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Odometer</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {assignedVehicle.current_odometer != null ? `${assignedVehicle.current_odometer.toLocaleString()} KM` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Capacity</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {assignedVehicle.capacity_kg != null ? `${assignedVehicle.capacity_kg.toLocaleString()} KG` : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

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

      <CreateTripModal
        isOpen={isCreateTripOpen}
        onClose={() => setIsCreateTripOpen(false)}
        initialDriverId={id}
      />
    </DashboardLayout>
  );
}
