import DashboardLayout from '@/components/layout/DashboardLayout';
import CargoLoadingView from './CargoLoadingView';

export default function VehicleDetailsPage() {
  return (
    <DashboardLayout active="Vehicles" title="Cargo Details">
      <div className="w-full h-full bg-[#FDFDFD]">
        <CargoLoadingView />
      </div>
    </DashboardLayout>
  );
}
