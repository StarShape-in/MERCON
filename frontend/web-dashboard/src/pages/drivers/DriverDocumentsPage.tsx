import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Eye, Edit, Building2, User } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService } from '@/services/driverService';
import OwnerFolderDetail from '@/components/documents/OwnerFolderDetail';
import DriverAvatar from '@/components/ui/DriverAvatar';
import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DriverPreviewModal from '@/components/drivers/DriverPreviewModal';

export default function DriverDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const { data: driver, isLoading } = useQuery({
    // Lookup shape: this page shows a name, status and phone — it does not need
    // (and was previously loading) the driver's entire trip history.
    queryKey: ['driver', id, 'lookup'],
    queryFn: () => driverService.getById(id!, { lookup: true }),
    enabled: !!id,
  });

  const driverFullName = driver ? `${driver.first_name} ${driver.last_name}` : 'Driver Profile';

  return (
    <DashboardLayout
      active="Drivers"
      title={`Driver Documents: ${driverFullName}`}
    >
      <div className="px-3 sm:px-5 pb-4 space-y-3 animate-fade-in max-w-[1350px] mx-auto w-full">
        
        {/* Slim Top Action Strip */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Driver Documents: {driverFullName}
            </h1>
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-bold border-none text-[11px] px-2 py-0.5">
              Compliance Vault
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewModalOpen(true)}
              className="h-7 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 px-2.5 font-bold"
            >
              <User className="w-3.5 h-3.5 mr-1" /> Quick Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/drivers/${id}`)}
              className="h-7 text-xs text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 px-2"
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> View Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/drivers/${id}/edit`)}
              className="h-7 text-xs text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 px-2"
            >
              <Edit className="w-3.5 h-3.5 mr-1" /> Edit Driver
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/drivers')}
              className="h-7 text-xs font-medium border-slate-200 dark:border-slate-800 px-2.5"
            >
              Driver Roster
            </Button>
          </div>
        </div>

        {/* Driver Summary Profile Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3">
            <DriverAvatar
              src={driver?.avatar_url}
              firstName={driver?.first_name}
              lastName={driver?.last_name}
              size="md"
              status={driver?.status}
              showStatusDot
              previewable
              onPreview={() => setIsPreviewModalOpen(true)}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-brand transition-colors" onClick={() => setIsPreviewModalOpen(true)}>
                  {driverFullName}
                </h1>
                {driver?.status && <StatusBadge status={driver.status} />}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-3 mt-0.5 font-medium">
                <span>Phone: {driver?.phone_primary ? `+966 ${driver.phone_primary}` : 'N/A'}</span>
                <span>•</span>
                <span>Saudi License ID: <strong className="font-mono text-slate-700 dark:text-slate-300">{driver?.license_number || 'N/A'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> MERCON Logistics Vault
            </span>
          </div>
        </div>

        {/* Full-width Owner Folder Vault Component */}
        {id && <OwnerFolderDetail ownerType="Driver" ownerId={id} />}

      </div>

      <DriverPreviewModal
        driver={driver || null}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </DashboardLayout>
  );
}

