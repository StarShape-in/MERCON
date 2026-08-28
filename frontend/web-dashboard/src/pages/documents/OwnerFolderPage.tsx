import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Download, UploadCloud, Truck, Folder, MoreVertical, RotateCw, ChevronDown, FilePlus, ExternalLink,
  User, Activity, Radio, Layers, Shield
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { documentService } from '@/services/documentService';
import { downloadCSV } from '@/utils/exportUtils';
import { getOwnerCardSummary } from '@/lib/documents';
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
import { cn } from '@/lib/utils';

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
    : (driver ? `${driver.first_name} ${driver.last_name}` : 'Saleem Taha Khan');

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
      <div className="pt-6 sm:pt-8 px-4 sm:px-6 pb-4 max-w-[1600px] mx-auto h-[calc(100vh-4.5rem)] flex flex-col overflow-hidden space-y-4">
        
        {/* ── Top Header Bar with Big Title & Action Group ─────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-13 h-13 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/80 shadow-2xs shrink-0">
              {normalizedType === 'Driver' ? <User className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                  {vehicle?.plate_number || ownerName}
                </h1>
                <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 font-semibold text-xs px-2.5 py-0.5 shadow-2xs">
                  {normalizedType === 'Driver' ? 'Driver Compliance Vault' : 'Vehicle Compliance Vault'}
                </Badge>
                <Badge className={cardSummary.className}>
                  {cardSummary.isCompliant ? '🟢 Fully Compliant' : `🔴 ${cardSummary.label}`}
                </Badge>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-2">
                <span>Ref: {vehicle?.ref_id || driver?.ref_id || 'REF-101'}</span>
                <span>•</span>
                <span>{normalizedType === 'Vehicle' ? `${(vehicle?.capacity_kg ? vehicle.capacity_kg / 1000 : 8).toFixed(0)} Ton Payload` : (driver?.phone_primary || 'Saudi MOT Licensed Driver')}</span>
                <span>•</span>
                <span>Driver: {driverName}</span>
              </p>
            </div>
          </div>

          {/* Right Action Hierarchy */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Primary Action: + Upload Document */}
            <Button
              size="sm"
              onClick={() => setIsBatchOpen(true)}
              className="h-9 px-4 text-xs font-extrabold gap-1.5 bg-brand hover:bg-brand-hover text-white shadow-xs rounded-xl cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>+ Upload Document</span>
            </Button>

            {/* Secondary Action: + Add Custom Document */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCustomDocOpen(true)}
              className="h-9 px-3 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer rounded-xl"
            >
              <FilePlus className="w-3.5 h-3.5 text-brand" />
              <span>+ Add Custom Document</span>
            </Button>

            {/* Direct Profile Button */}
            {normalizedType === 'Vehicle' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/vehicles/${ownerId}`)}
                className="h-9 px-3 text-xs font-bold gap-1.5 border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/80 cursor-pointer rounded-xl"
              >
                <span>Vehicle Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}

            {(assignedDriver?.id || normalizedType === 'Driver') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/drivers/${assignedDriver?.id || ownerId}`)}
                className="h-9 px-3 text-xs font-bold gap-1.5 border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100/80 cursor-pointer rounded-xl"
              >
                <span>Driver Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* More ⋮ Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 rounded-xl cursor-pointer"
                  title="More Actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem
                  onClick={() => setIsBatchOpen(true)}
                  className="cursor-pointer text-xs font-semibold gap-2 py-2"
                >
                  <Folder className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Import Folder / Batch</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportSummary}
                  className="cursor-pointer text-xs font-semibold gap-2 py-2"
                >
                  <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Export Summary CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleRefresh}
                  className="cursor-pointer text-xs font-semibold gap-2 py-2"
                >
                  <RotateCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Refresh Vault Data</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Asset Specifications & Telematics Quick Strip (Matching VehicleDetailsPage) ──── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          {/* Box 1: Driver / Vehicle */}
          <div
            onClick={() => (assignedDriver?.id ? navigate(`/drivers/${assignedDriver.id}`) : (normalizedType === 'Driver' ? navigate(`/drivers/${ownerId}`) : null))}
            className={cn(
              "bg-blue-50/70 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 flex items-center gap-2.5 transition-all shadow-2xs group",
              assignedDriver?.id || normalizedType === 'Driver' ? "cursor-pointer hover:border-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-900/60" : ""
            )}
          >
            <div className="w-7.5 h-7.5 rounded-lg bg-blue-100 dark:bg-blue-900/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="text-[9px] font-black uppercase text-blue-600/80 dark:text-blue-400/80 tracking-wider block leading-none">
                Driver
              </span>
              <span className="font-mono text-xs font-black text-blue-900 dark:text-blue-100 truncate block mt-0.5">
                {driverName}
              </span>
            </div>
          </div>

          {/* Box 2: Spec / Type */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 flex items-center gap-2.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs">
            <div className="w-7.5 h-7.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-indigo-600/80 dark:text-indigo-400/80 tracking-wider block leading-none">Asset Spec</span>
              <span className="font-mono text-xs font-black text-indigo-900 dark:text-indigo-100 truncate block mt-0.5">
                {vehicle?.asset_type || (driver?.license_number ? 'Saudi Driving License' : 'Heavy Transport')}
              </span>
            </div>
          </div>

          {/* Box 3: Compliance Health */}
          <div className={cn(
            "p-2.5 rounded-xl border flex items-center gap-2.5 transition-all shadow-2xs",
            cardSummary.isCompliant
              ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60"
              : "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/60"
          )}>
            <div className={cn(
              "w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0",
              cardSummary.isCompliant ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/70 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-900/70 dark:text-rose-400"
            )}>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-wider block leading-none",
                cardSummary.isCompliant ? "text-emerald-700/80 dark:text-emerald-400/80" : "text-rose-700/80 dark:text-rose-400/80"
              )}>
                Health Status
              </span>
              <span className={cn(
                "font-mono text-xs font-black truncate block mt-0.5",
                cardSummary.isCompliant ? "text-emerald-900 dark:text-emerald-100" : "text-rose-900 dark:text-rose-100"
              )}>
                {cardSummary.isCompliant ? '🟢 Fully Compliant' : `🔴 ${cardSummary.label}`}
              </span>
            </div>
          </div>

          {/* Box 4: Telematics / Verification */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-2.5 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-2xs">
            <div className="w-7.5 h-7.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-emerald-700/80 dark:text-emerald-400/80 tracking-wider block leading-none">Integrations</span>
              <span className="font-mono text-xs font-black text-emerald-900 dark:text-emerald-100 truncate block mt-0.5">
                {vehicle?.gps_device_id || 'ZATCA / MOMRAH Linked'}
              </span>
            </div>
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
