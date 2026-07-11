import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, FileText, Truck, MapPin, Settings, AlertTriangle, Route } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { vehicleService } from '@/services/vehicleService';

export default function VehicleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vehicle, isLoading, error } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Vehicles" title="Vehicle Details">
        <div className="p-6">
          <div className="animate-pulse flex flex-col gap-6">
            <div className="h-20 bg-black/5 rounded-none"></div>
            <div className="h-64 bg-black/5 rounded-none"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !vehicle) {
    return (
      <DashboardLayout active="Vehicles" title="Vehicle Details">
        <div className="p-6 flex flex-col items-center justify-center text-center h-[50vh]">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Vehicle Not Found</h2>
          <p className="text-[#6E6E80] mb-6">The vehicle you are looking for does not exist or has been deleted.</p>
          <Btn label="Back to Vehicles" onClick={() => navigate('/vehicles')} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      active="Vehicles" 
      title={`Vehicle: ${vehicle.plate_number}`}
      actions={
        <div className="flex gap-2">
          <Btn 
            label="Documents" 
            variant="outline" 
            icon={<FileText size={14} />} 
            onClick={() => navigate(`/vehicles/${vehicle.id}/documents`)}
          />
          <Btn 
            label="Edit Vehicle" 
            icon={<Edit2 size={14} />} 
            onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
          />
        </div>
      }
    >
      <div className="px-6 pb-6 max-w-5xl">
        <button 
          onClick={() => navigate('/vehicles')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Vehicles
        </button>

        {/* Header Summary */}
        <div className="bg-white border border-black/[0.08] rounded-none p-6 mb-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center border border-black/[0.05]">
              <Truck size={28} className="text-[#E8450F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111] mb-1">
                {vehicle.plate_number}
              </h1>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-[#6E6E80] font-medium border border-black/[0.08] px-2 py-0.5 rounded-md bg-[#F5F5F7]">
                  {vehicle.ref_id || 'NO-REF'}
                </span>
                <StatusBadge status={vehicle.status} />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 md:gap-8 bg-[#F5F5F7] p-4 rounded-none border border-black/[0.04]">
            <div>
              <p className="text-xs text-[#6E6E80] font-medium mb-1">Vehicle Type</p>
              <div className="text-sm font-semibold text-[#444]">
                {vehicle.asset_type}
              </div>
            </div>
            <div>
              <p className="text-xs text-[#6E6E80] font-medium mb-1">Capacity</p>
              <p className="text-sm font-bold text-[#111] mt-1">
                {((vehicle.capacity_kg || 0) / 1000).toFixed(1)} Tons
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6E6E80] font-medium mb-1">Odometer</p>
              <div className="text-sm font-semibold text-[#444]">
                {vehicle.current_odometer.toLocaleString()} km
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white border border-black/[0.08] rounded-none p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#111] mb-4 flex items-center gap-2">
                <Settings size={16} className="text-[#E8450F]" /> Asset Details
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-black/[0.04]">
                  <span className="text-sm text-[#6E6E80] font-medium">GPS Device ID</span>
                  <span className="text-sm font-semibold font-mono text-[#111]">
                    {vehicle.gps_device_id || 'Not Installed'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-black/[0.04]">
                  <span className="text-sm text-[#6E6E80] font-medium">Trailer Attached</span>
                  <span className="text-sm font-semibold text-[#111]">
                    {vehicle.trailer_number || 'None'}
                  </span>
                </div>
                {vehicle.trailer_number && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#6E6E80] font-medium">Trailer Type / Cap</span>
                    <span className="text-xs font-semibold text-[#111] text-right">
                      {vehicle.trailer_type} / {vehicle.trailer_capacity_kg ? ((vehicle.trailer_capacity_kg || 0) / 1000).toFixed(1) + 't' : 'N/A'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-black/[0.08] rounded-none p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#111] mb-4 flex items-center gap-2">
                <FileText size={16} className="text-[#E8450F]" /> Documents Status
              </h3>
              
              {/* Mock Document Statuses */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#F0FDF4] border border-green-200 px-3 py-2 rounded-none">
                  <span className="text-xs font-semibold text-green-800">Registration</span>
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Valid</span>
                </div>
                <div className="flex items-center justify-between bg-[#FEF2F2] border border-red-200 px-3 py-2 rounded-none">
                  <span className="text-xs font-semibold text-red-800">Insurance</span>
                  <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Expired</span>
                </div>
              </div>
              
              <button 
                onClick={() => navigate(`/vehicles/${vehicle.id}/documents`)}
                className="w-full mt-4 py-2 bg-white border border-[#E8450F] text-[#E8450F] text-xs font-bold rounded-none hover:bg-[#E8450F]/5 transition-colors"
              >
                Manage Documents
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white border border-black/[0.08] rounded-none shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-black/[0.04] flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#111] flex items-center gap-2">
                  <Route size={16} className="text-[#E8450F]" /> Live Location Mockup
                </h3>
              </div>
              
              <div className="flex-1 bg-[#F9F9FB] flex items-center justify-center relative min-h-[300px]">
                {vehicle.status === 'OnTrip' ? (
                  <div className="absolute inset-0 bg-blue-100/50 flex flex-col items-center justify-center">
                    <MapPin size={32} className="text-[#2563EB] mb-2" />
                    <p className="text-sm font-bold text-[#111]">In Transit</p>
                    <p className="text-xs text-[#6E6E80] mt-1">Live tracking active via GPS {vehicle.gps_device_id}</p>
                  </div>
                ) : (
                  <div className="text-center text-[#9898A4]">
                    <Truck size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">Vehicle is not currently on a trip.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
