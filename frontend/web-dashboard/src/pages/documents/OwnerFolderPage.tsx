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
      <div className="px-4 sm:px-6 pb-4 max-w-[1600px] mx-auto h-[calc(100vh-4.5rem)] flex flex-col overflow-hidden space-y-3">
        
        {/* ── Executive MERCON Header with Driver Photo & Vehicle Specs (Sleek Charcoal Command Header) ── */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-[#1E293B] to-slate-900 px-6 py-4.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-5 shrink-0 text-white">
          
          <div className="min-w-0 space-y-2.5">
            {/* Row 1: Vehicle Plate Number & Specification Tags */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight leading-none">
                {vehicle?.plate_number || (normalizedType === 'Vehicle' ? ownerName : 'VRA-5510')}
              </h1>
              
              {/* Vehicle Ref Code Tag */}
              <span className="px-3 py-1 rounded-xl bg-slate-800/90 text-slate-200 font-mono text-xs font-black border border-slate-700/80 shadow-2xs">
                {vehicle?.ref_id || 'TRK-110'}
              </span>

              {/* Capacity Tag */}
              <span className="px-3 py-1 rounded-xl bg-slate-800/90 text-slate-300 font-mono text-xs font-bold border border-slate-700/80 shadow-2xs">
                {(vehicle?.capacity_kg ? vehicle.capacity_kg / 1000 : 10).toFixed(0)} TON
              </span>
            </div>

            {/* Row 2: Driver Photo Avatar + Driver Name + Phone Number */}
            {(() => {
              const fullDName = activeDriverObj ? `${activeDriverObj.first_name} ${activeDriverObj.last_name}` : (normalizedType === 'Driver' ? ownerName : driverName);
              const fName = activeDriverObj?.first_name || fullDName.split(' ')[0] || 'Kashif';
              const lName = activeDriverObj?.last_name || fullDName.split(' ').slice(1).join(' ') || 'Ali';
              const photoUrl = activeDriverObj?.avatar_url || (activeDriverObj as any)?.photo_url || (activeDriverObj as any)?.image_url;
              const resolvedPhoto = photoUrl ? resolveFileUrl(photoUrl) : undefined;
              const phoneNum = (activeDriverObj as any)?.phone || (activeDriverObj as any)?.phone_number || (assignedDriver as any)?.phone || '+966 50 123 4567';

              return (
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-200 flex-wrap pt-0.5">
                  <DriverAvatar
                    src={resolvedPhoto}
                    firstName={fName}
                    lastName={lName}
                    size="md"
                    className="w-10 h-10 shrink-0 shadow-sm border-2 border-[#FA634E] rounded-full"
                  />
                  <strong className="text-white font-black text-base sm:text-lg tracking-tight">
                    {fullDName}
                  </strong>
                  {phoneNum && (
                    <span className="text-slate-400 font-mono font-semibold text-xs sm:text-sm">
                      ({phoneNum})
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right Side: Compliance Status Badge */}
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            <Badge className={cn('text-sm font-mono font-black px-4.5 py-2.5 border rounded-xl shadow-2xs', cardSummary.className)}>
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
