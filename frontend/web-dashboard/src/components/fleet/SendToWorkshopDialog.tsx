import ScheduleMaintenanceModal, { ScheduleMaintenanceModalVehicle } from '@/components/maintenance/ScheduleMaintenanceModal';

export type WorkshopVehicle = ScheduleMaintenanceModalVehicle;

interface SendToWorkshopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: WorkshopVehicle[];
  onSuccess: () => void;
}

export default function SendToWorkshopDialog({
  open,
  onOpenChange,
  vehicles,
  onSuccess,
}: SendToWorkshopDialogProps) {
  return (
    <ScheduleMaintenanceModal
      open={open}
      onOpenChange={onOpenChange}
      initialVehicleId={vehicles.length === 1 ? vehicles[0].id : undefined}
      bulkVehicles={vehicles.length > 0 ? vehicles : undefined}
      onSuccess={onSuccess}
    />
  );
}
