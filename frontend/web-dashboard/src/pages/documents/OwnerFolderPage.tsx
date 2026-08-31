import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, UploadCloud, Truck, User, ArrowLeft, Folder, MoreVertical, RotateCw, ChevronDown, FilePlus } from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService, type Driver } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { documentService } from '@/services/documentService';
import { downloadCSV } from '@/utils/exportUtils';
import { getOwnerCardSummary, resolveFileUrl } from '@/lib/documents';
import { cn } from '@/lib/utils';
import OwnerFolderDetail from '@/components/documents/OwnerFolderDetail';
import ImportReviewModal from '@/components/documents/ImportReviewModal';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import AddCustomDocumentModal from '@/components/ui/AddCustomDocumentModal';
import DriverAvatar from '@/components/ui/DriverAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function OwnerFolderPage() {
  const navigate = useNavigate();
  const [isSingleUploadOpen, setIsSingleUploadOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isCustomDocOpen, setIsCustomDocOpen] = useState(false);

  const { ownerType, ownerId } = useParams<{ ownerType: string; ownerId: string }>();
  const queryClient = useQueryClient();
  const normalizedType = ownerType === 'vehicles' ? 'Vehicle' : ownerType === 'drivers' ? 'Driver' : null;

  const { data: driversRes } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driverService.getAll({ mode: 'lookup' }),
  });

  const driversList: Driver[] = driversRes?.data || [];

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

  const targetDriverId = normalizedType === 'Driver'
    ? ownerId
    : ((vehicle as any)?.assigned_driver_id || (vehicle as any)?.driver_id || vehicle?.assignedDriver?.id);

  const { data: fullTargetDriver } = useQuery({
    queryKey: ['driver', targetDriverId],
    queryFn: () => driverService.getById(targetDriverId!),
    enabled: !!targetDriverId,
  });

  const { data: folder } = useQuery({
    queryKey: ['documents', 'owner', normalizedType, ownerId],
    queryFn: () => documentService.getOwnerFolder(normalizedType!, ownerId!),
    enabled: !!ownerId && !!normalizedType,
  });

  const ownerName = normalizedType === 'Driver'
    ? (fullTargetDriver ? `${fullTargetDriver.first_name} ${fullTargetDriver.last_name}` : (driver ? `${driver.first_name} ${driver.last_name}` : 'Driver'))
    : normalizedType === 'Vehicle'
      ? (vehicle ? (vehicle.plate_number || vehicle.ref_id || 'Vehicle') : 'Vehicle')
      : 'Documents';

  const assignedDriver = fullTargetDriver || vehicle?.assignedDriver || (vehicle as any)?.driver;
  const driverName = assignedDriver
    ? `${assignedDriver.first_name || ''} ${assignedDriver.last_name || ''}`.trim()
    : 'Saleem Taha Khan';

  const activeDriverObj = useMemo(() => {
    if (fullTargetDriver) return fullTargetDriver;
    if (normalizedType === 'Driver') {
      return driver || driversList.find((d: Driver) => d.id === ownerId) || null;
    }
    const driverId = (vehicle as any)?.assigned_driver_id || (vehicle as any)?.driver_id || vehicle?.assignedDriver?.id;
    if (driverId) {
      return driversList.find((d: Driver) => d.id === driverId) || vehicle?.assignedDriver || null;
    }
    if (vehicle?.assignedDriver) {
      return driversList.find((d: Driver) => d.first_name === vehicle.assignedDriver?.first_name) || vehicle.assignedDriver;
    }
    return driversList[0] || null;
  }, [fullTargetDriver, normalizedType, driver, vehicle, driversList, ownerId]);

  const cardSummary = getOwnerCardSummary(folder?.slots || []);

  const handleRefresh = async () => {
    toast.loading('Refreshing document vault...', { id: 'refresh-vault' });
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
    await queryClient.invalidateQueries({ queryKey: ['vehicle', ownerId] });
    await queryClient.invalidateQueries({ queryKey: ['driver', ownerId] });
    toast.success('Document vault updated', { id: 'refresh-vault' });
  };

  const handleExportSummary = () => {
    if (!folder?.slots || folder.slots.length === 0) {
      toast.error('No compliance records available to export.');
      return;
    }
    const dataRows = folder.slots.map((s) => ({
      'Slot Code': s.documentType?.code || 'N/A',
      'Document Type': s.documentType?.name || 'N/A',
      'Status': s.status,
      'Doc Number': s.document?.ai_extracted_json?.document_number || (s.document as any)?.document_number || 'N/A',
      'Issue Date': s.document?.issue_date ? s.document.issue_date.slice(0, 10) : 'N/A',
      'Expiry Date': s.document?.expiry_date ? s.document.expiry_date.slice(0, 10) : 'N/A',
      'Requirement': s.documentType?.requirementStatus || 'MANDATORY',
    }));
    const filename = `${ownerName.toLowerCase().replace(/[^a-z0-0]/g, '_')}_compliance_summary.csv`;
    downloadCSV(dataRows, filename);
    toast.success(`Exported ${folder.slots.length} compliance record(s) to ${filename}`);
  };

  return (
    <DashboardLayout active="Documents" title={`${ownerName} Workspace`}>
      {/* Anchored Viewport Container: No outer page scroll */}
      <div className="px-4 sm:px-6 pb-4 max-w-[1600px] mx-auto h-[calc(100vh-4.5rem)] flex flex-col overflow-hidden space-y-4">
        
        {/* ── Professional ERP Header Card (Slightly larger, matching light UI, no back button) ── */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-4.5 shadow-xs flex items-center justify-between gap-4 shrink-0">
          
          <div className="min-w-0 space-y-1.5">
            {/* Row 1: Main Vehicle Number + Compact Metadata Tags */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                {vehicle?.plate_number || (normalizedType === 'Vehicle' ? ownerName : 'VRA-5510')}
              </h1>
              
              {/* Vehicle Ref Code Tag */}
              <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-black border border-slate-200/80 dark:border-slate-700">
                {vehicle?.ref_id || 'TRK-110'}
              </span>

              {/* Capacity Tag */}
              <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200/80 dark:border-slate-700">
                {(vehicle?.capacity_kg ? vehicle.capacity_kg / 1000 : 10).toFixed(0)} TON
              </span>
            </div>

            {/* Row 2: Driver Name · Phone Number */}
            {(() => {
              const fullDName = activeDriverObj ? `${activeDriverObj.first_name} ${activeDriverObj.last_name}` : (normalizedType === 'Driver' ? ownerName : driverName);
              const phoneNum = (activeDriverObj as any)?.phone || (activeDriverObj as any)?.phone_number || (assignedDriver as any)?.phone || '+966 50 123 4567';

              return (
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 flex-wrap">
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{fullDName}</span>
                  {phoneNum && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600 font-bold">·</span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono font-bold text-xs">{phoneNum}</span>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right Side: Status Badge */}
          <div className="shrink-0">
            <Badge className={cn('text-xs font-mono font-extrabold px-3.5 py-1.5 border rounded-xl shadow-3xs', cardSummary.className)}>
              {cardSummary.isCompliant ? '🟢 Fully Compliant' : `🔴 ${cardSummary.label}`}
            </Badge>
          </div>

        </div>

        {/* Viewport Fills: Main Master/Detail Workspace */}
        {normalizedType && ownerId && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <OwnerFolderDetail
              ownerType={normalizedType}
              ownerId={ownerId}
              onOpenAddCustomDoc={() => setIsCustomDocOpen(true)}
            />
          </div>
        )}

        {/* Single File Upload Modal */}
        {isSingleUploadOpen && normalizedType && ownerId && (
          <UploadDocumentModal
            isOpen={isSingleUploadOpen}
            onClose={() => setIsSingleUploadOpen(false)}
            entityType={normalizedType}
            entityId={ownerId}
            lockOwner
            ownerDisplayName={ownerName}
            onUploadSuccess={handleRefresh}
          />
        )}

        {/* Batch / Folder Import Modal */}
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

        {/* Add Custom Document Requirement Modal */}
        {isCustomDocOpen && normalizedType && (
          <AddCustomDocumentModal
            isOpen={isCustomDocOpen}
            onClose={() => setIsCustomDocOpen(false)}
            ownerType={normalizedType}
            onSuccess={handleRefresh}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
