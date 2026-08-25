import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Download, UploadCloud, Truck } from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import OwnerFolderDetail from '@/components/documents/OwnerFolderDetail';
import ImportReviewModal from '@/components/documents/ImportReviewModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function OwnerFolderPage() {
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const { ownerType, ownerId } = useParams<{ ownerType: string; ownerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const ownerName = normalizedType === 'Driver'
    ? (driver ? `${driver.first_name} ${driver.last_name}` : 'Driver')
    : normalizedType === 'Vehicle'
      ? (vehicle ? (vehicle.plate_number || vehicle.ref_id || 'Vehicle') : 'Vehicle')
      : 'Documents';

  const handleRefresh = async () => {
    toast.loading('Refreshing document vault...', { id: 'refresh-vault' });
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
    await queryClient.invalidateQueries({ queryKey: ['vehicle', ownerId] });
    await queryClient.invalidateQueries({ queryKey: ['driver', ownerId] });
    toast.success('Document vault updated', { id: 'refresh-vault' });
  };

  const handleExportSummary = () => {
    toast.info('Exporting document summary CSV...');
  };

  return (
    <DashboardLayout active="Documents" title={`${ownerName} Vault`}>
      <div className="px-4 sm:px-6 pb-10 max-w-[1600px] mx-auto space-y-6">
        
        {/* MERCON Header Layout & Top Bar Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          
          <div className="flex items-center gap-3 flex-wrap">
            {normalizedType === 'Vehicle' && vehicle ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                    {vehicle.plate_number}
                  </h1>
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      Capacity: <strong className="text-slate-800 dark:text-slate-200 font-mono">{(vehicle.capacity_kg ? vehicle.capacity_kg / 1000 : 24).toFixed(0)} Ton</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Driver: <strong className="text-slate-800 dark:text-slate-200">
                        {(() => {
                          const assignedDriver = vehicle.assignedDriver || (vehicle as any).driver;
                          return assignedDriver ? `${assignedDriver.first_name || ''} ${assignedDriver.last_name || ''}`.trim() : 'Unassigned';
                        })()}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {normalizedType} Document Vault: <span className="text-indigo-600 dark:text-indigo-400">{ownerName}</span>
                </h1>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 font-semibold px-2.5 py-0.5 text-xs">
                  Operations / Documents Module
                </Badge>
              </div>
            )}
          </div>

          {/* Right: Top Bar Actions Group */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setIsBatchOpen(true)}
              className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Upload Document
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSummary}
              className="h-9 px-3.5 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5" /> Export Summary
            </Button>
          </div>
        </div>

        {/* Folder Content & Details */}
        {normalizedType && ownerId && (
          <OwnerFolderDetail ownerType={normalizedType} ownerId={ownerId} />
        )}

        {isBatchOpen && normalizedType && ownerId && (
          <ImportReviewModal
            isOpen={isBatchOpen}
            onClose={() => setIsBatchOpen(false)}
            lockOwnerType={normalizedType!}
            lockOwnerId={ownerId!}
            ownerDisplayName={ownerName}
            onImported={handleRefresh}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

