import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService } from '@/services/driverService';
import OwnerFolderDetail from '@/components/documents/OwnerFolderDetail';

export default function DriverDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: driver } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driverService.getById(id!),
    enabled: !!id,
  });

  return (
    <DashboardLayout
      active="Drivers"
      title={`Driver Documents: ${driver?.first_name || ''} ${driver?.last_name || ''}`}
    >
      <div className="px-4 sm:px-6 pb-6 max-w-3xl">
        <button
          onClick={() => navigate(`/drivers/${id}`)}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Driver Details
        </button>

        {id && <OwnerFolderDetail ownerType="Driver" ownerId={id} />}
      </div>
    </DashboardLayout>
  );
}
