import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import OwnerFolderDetail from '@/components/documents/OwnerFolderDetail';

export default function OwnerFolderPage() {
  const { ownerType, ownerId } = useParams<{ ownerType: string; ownerId: string }>();
  const navigate = useNavigate();
  const normalizedType = ownerType === 'vehicles' ? 'Vehicle' : ownerType === 'drivers' ? 'Driver' : null;

  const { data: driver } = useQuery({
    queryKey: ['driver', ownerId],
    queryFn: () => driverService.getById(ownerId!),
    enabled: !!ownerId && normalizedType === 'Driver',
  });

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', ownerId],
    queryFn: () => vehicleService.getById(ownerId!),
    enabled: !!ownerId && normalizedType === 'Vehicle',
  });

  const title = normalizedType === 'Driver'
    ? `Driver Documents: ${driver?.first_name || ''} ${driver?.last_name || ''}`
    : normalizedType === 'Vehicle'
      ? `Vehicle Documents: ${vehicle?.plate_number || vehicle?.ref_id || ''}`
      : 'Documents';

  return (
    <DashboardLayout active="Documents" title={title}>
      <div className="px-4 sm:px-6 pb-6 max-w-3xl">
        <button
          onClick={() => navigate('/documents')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Documents
        </button>

        {normalizedType && ownerId && (
          <OwnerFolderDetail ownerType={normalizedType} ownerId={ownerId} />
        )}
      </div>
    </DashboardLayout>
  );
}
