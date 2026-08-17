import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { vehicleService } from '@/services/vehicleService';
import OwnerFolderDetail from '@/components/documents/OwnerFolderDetail';

export default function VehicleDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleService.getById(id!),
    enabled: !!id,
  });

  return (
    <DashboardLayout
      active="Vehicles"
      title={`Vehicle Documents: ${vehicle?.plate_number || vehicle?.ref_id || ''}`}
    >
      <div className="px-4 sm:px-6 pb-6 max-w-3xl">
        <button
          onClick={() => navigate(`/vehicles/${id}`)}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Vehicle Details
        </button>

        {id && <OwnerFolderDetail ownerType="Vehicle" ownerId={id} />}
      </div>
    </DashboardLayout>
  );
}
