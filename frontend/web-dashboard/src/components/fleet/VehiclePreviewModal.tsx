import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, FileText, Edit2, ExternalLink, ShieldCheck, AlertTriangle,
  X, MapPin, User, Gauge, Wrench, Calendar, Layers, Send
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import PhoneDisplay from '@/components/ui/PhoneDisplay';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { Vehicle } from '@/services/vehicleService';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

interface VehiclePreviewModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSendToWorkshop?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
}

export default function VehiclePreviewModal({
  vehicle,
  isOpen,
  onClose,
  onSendToWorkshop,
  onEdit,
}: VehiclePreviewModalProps) {
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();

  if (!vehicle) return null;

  const assignedDriver = vehicle.assignedDriver;
  const activeTrip = vehicle.trips?.[0];
  const isMaintenance = vehicle.status === 'Maintenance';
  const isAvailable = vehicle.status === 'Available';
  const isOnTrip = vehicle.status === 'OnTrip';

  const handleOpenFullDetails = () => {
    onClose();
    navigate(`/vehicles/${vehicle.id}`);
  };

  const handleOpenEdit = () => {
    onClose();
    if (onEdit) {
      onEdit(vehicle);
    } else {
      navigate(`/vehicles/${vehicle.id}/edit`);
    }
  };

  const handleOpenFinancials = () => {
    onClose();
    navigate(`/vehicles/${vehicle.id}/financials`);
  };

  const handleWhatsAppDriver = () => {
    if (!assignedDriver?.phone_primary) return;
    const cleanPhone = assignedDriver.phone_primary.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[92vw] p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
        {/* Header Strip */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  Vehicle Profile Preview
                </DialogTitle>
                <StatusBadge status={vehicle.status} />
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                  {vehicle.ref_id || `TRK-${vehicle.id.slice(0, 5).toUpperCase()}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Fleet asset specification & operational dossier preview
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Hero Identity Banner */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-indigo-500 to-emerald-500" />

            <div className="w-16 h-16 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center text-xl font-black font-mono shrink-0 shadow-md border border-slate-700">
              <Truck className="w-8 h-8 text-indigo-400" />
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-mono font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {vehicle.plate_number}
                </h2>
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs">
                  {vehicle.asset_type || 'Rigid Truck'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-semibold">
                  <Gauge className="w-3.5 h-3.5 text-slate-400" />
                  {vehicle.current_odometer ? `${vehicle.current_odometer.toLocaleString()} KM` : '0 KM'}
                </span>
                <span className="flex items-center gap-1 font-semibold">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Payload: {vehicle.capacity_kg ? `${vehicle.capacity_kg / 1000} TON` : 'N/A'}
                </span>
                {vehicle.trailer_number && (
                  <span className="flex items-center gap-1 font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                    Trailer: {vehicle.trailer_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand" /> Duty Status
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <StatusBadge status={vehicle.status} />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" /> Assigned Driver
              </span>
              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 pt-0.5 truncate">
                {assignedDriver ? `${assignedDriver.first_name} ${assignedDriver.last_name}` : 'Unassigned'}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Active Dispatch
              </span>
              <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 pt-0.5 truncate">
                {activeTrip ? activeTrip.ref_id || `TRIP-${activeTrip.id.slice(0, 5)}` : 'No Active Trip'}
              </div>
            </div>
          </div>

          {/* Detailed Specifications Dossier */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" /> Vehicle Specification & Hardware
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Asset Ref Code:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {vehicle.ref_id || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Asset Type / Rig:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {vehicle.asset_type}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">GPS Device ID:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {vehicle.gps_device_id || 'Not Installed'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">ICCES Device ID:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {vehicle.icces_device_id || 'Not Installed'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Trailer Attached:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {vehicle.trailer_number || 'None'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Fleet Onboarding Date:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatInDeploymentTz(vehicle.createdAt, tz, 'MM/dd/yyyy')}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Driver Card if present */}
          {assignedDriver && (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                  {assignedDriver.first_name?.[0]}{assignedDriver.last_name?.[0]}
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {assignedDriver.first_name} {assignedDriver.last_name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Ref: {assignedDriver.ref_id || 'DRV-N/A'}</span>
                    <span>•</span>
                    <PhoneDisplay phone={assignedDriver.phone_primary} variant="badge" />
                  </div>
                </div>
              </div>

              {assignedDriver.phone_primary && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWhatsAppDriver}
                  className="h-8 text-xs font-bold gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" /> Driver WhatsApp
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onSendToWorkshop && !isMaintenance && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onSendToWorkshop(vehicle);
                }}
                className="h-8.5 text-xs font-bold gap-1.5 border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" /> Send to Workshop
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEdit}
              className="h-8.5 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit Vehicle
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenFinancials}
              className="h-8.5 text-xs font-bold gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" /> Financial P&amp;L
            </Button>

            <Button
              size="sm"
              onClick={handleOpenFullDetails}
              className="h-8.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white gap-1.5 px-4 shadow-sm"
            >
              Full Vehicle Profile <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
