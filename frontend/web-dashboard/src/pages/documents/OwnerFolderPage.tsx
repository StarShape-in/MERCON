import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, UploadCloud, Truck, User, Folder, MoreVertical, RotateCw, ChevronDown, FilePlus } from 'lucide-react';
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
        
        {/* ── Single Prominent MERCON Header: Highlighted Truck & Driver Cards ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Highlighted Truck Badge Card */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white shadow-2xs border border-slate-800">
              <Truck className="w-4.5 h-4.5 text-[#FA634E] shrink-0" />
              <div className="flex items-center gap-2">
                <span className="font-black font-mono text-sm tracking-wide text-white">
                  {vehicle?.plate_number || (normalizedType === 'Vehicle' ? ownerName : 'BRA-4012')}
                </span>
                <span className="text-[11px] font-mono text-slate-300 font-bold">
                  ({vehicle?.ref_id || 'TRK-117'} · {(vehicle?.capacity_kg ? vehicle.capacity_kg / 1000 : 12).toFixed(0)} TON)
                </span>
              </div>
            </div>

            {/* Separator Dot */}
            <span className="text-slate-300 dark:text-slate-700 font-bold hidden sm:inline">•</span>

            {/* Highlighted Driver Badge Card */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 shadow-2xs">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">Driver:</span>
                <span className="text-indigo-950 dark:text-indigo-100 font-black">
                  {normalizedType === 'Driver' ? ownerName : driverName}
                </span>
                {((driver as any)?.phone || (driver as any)?.phone_number || (assignedDriver as any)?.phone || '+966 50 123 4567') && (
                  <span className="text-[11px] font-mono font-semibold text-indigo-600/80 dark:text-indigo-300/80">
                    · Phone: {(driver as any)?.phone || (driver as any)?.phone_number || (assignedDriver as any)?.phone || '+966 50 123 4567'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action & Compliance Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <Badge className={cn('text-xs font-mono font-extrabold px-3 py-1 border rounded-full shadow-none', cardSummary.className)}>
              {cardSummary.isCompliant ? '🟢 Fully Compliant' : `🔴 ${cardSummary.label}`}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/documents')}
              className="h-8.5 px-3 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer rounded-xl"
            >
              Back to Vault
            </Button>
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
