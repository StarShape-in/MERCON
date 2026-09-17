import DashboardLayout from '@/components/layout/DashboardLayout';
import CargoLoadingView from './CargoLoadingView';

export default function VehicleDetailsPage() {
  return (
    <DashboardLayout active="Vehicles" title="Truck Details" fixedViewport={true}>
      <div className="w-full h-full bg-[#F5F7FA] overflow-hidden">
        <CargoLoadingView />
      </div>
    </DashboardLayout>
  );
}
