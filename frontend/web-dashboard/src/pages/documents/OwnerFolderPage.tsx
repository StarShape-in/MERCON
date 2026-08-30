import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, UploadCloud, Truck, User, ArrowLeft, Folder, MoreVertical, RotateCw, ChevronDown, FilePlus } from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { documentService } from '@/services/documentService';
import { downloadCSV } from '@/utils/exportUtils';
import { getOwnerCardSummary } from '@/lib/documents';
import { cn } from '@/lib/utils';
import OwnerFolderDetail from '@/components/documents/OwnerFolderDetail';
import ImportReviewModal from '@/components/documents/ImportReviewModal';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import AddCustomDocumentModal from '@/components/ui/AddCustomDocumentModal';
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

  const { data: folder } = useQuery({
    queryKey: ['documents', 'owner', normalizedType, ownerId],
    queryFn: () => documentService.getOwnerFolder(normalizedType!, ownerId!),
    enabled: !!ownerId && !!normalizedType,
  });

  const ownerName = normalizedType === 'Driver'
    ? (driver ? `${driver.first_name} ${driver.last_name}` : 'Driver')
    : normalizedType === 'Vehicle'
      ? (vehicle ? (vehicle.plate_number || vehicle.ref_id || 'Vehicle') : 'Vehicle')
      : 'Documents';

  const assignedDriver = vehicle?.assignedDriver || (vehicle as any)?.driver;
  const driverName = assignedDriver
    ? `${assignedDriver.first_name || ''} ${assignedDriver.last_name || ''}`.trim()
    : 'Saleem Taha Khan';

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
        
        {/* ── Executive MERCON Operating System Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-3 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
              title="Back to Documents Vault"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Vehicle Identity & Driver Metadata Stack */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                  {vehicle?.plate_number || (normalizedType === 'Vehicle' ? ownerName : 'VRA-5510')}
                </h1>
                
                {/* Vehicle Ref Code Tag */}
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200/60 dark:border-slate-700">
                  {vehicle?.ref_id || 'TRK-110'}
                </span>

                {/* Capacity Tag */}
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs font-bold border border-slate-200/60 dark:border-slate-700">
                  {(vehicle?.capacity_kg ? vehicle.capacity_kg / 1000 : 10).toFixed(0)} TON
                </span>
              </div>

              {/* Driver Details Subtitle Row */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
                <span className="text-slate-400 font-medium">Assigned Driver:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-extrabold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#FA634E]" />
                  {normalizedType === 'Driver' ? ownerName : driverName}
                </strong>
                {((driver as any)?.phone || (driver as any)?.phone_number || (assignedDriver as any)?.phone || '+966 50 123 4567') && (
                  <span className="text-slate-400 font-mono">
                    ({(driver as any)?.phone || (driver as any)?.phone_number || (assignedDriver as any)?.phone || '+966 50 123 4567'})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Compliance Status Badge */}
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            <Badge className={cn('text-xs font-mono font-black px-3.5 py-1.5 border rounded-xl shadow-2xs', cardSummary.className)}>
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
